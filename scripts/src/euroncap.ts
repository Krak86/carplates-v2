/**
 * Offline scrape of euroncap.com crash-test ratings into `registry.euroncap_ratings`.
 *
 *   pnpm ingest:euroncap                  # every assessment in the sitemap
 *   pnpm ingest:euroncap -- --limit 20    # quick dev slice
 *   pnpm ingest:euroncap -- --dry-run     # parse + count, write nothing
 *   pnpm ingest:euroncap -- --refresh     # re-fetch pages already cached on disk
 *   pnpm ingest:euroncap -- --export-csv ./x.csv[.gz]   # dump the current table, no scraping
 *   pnpm ingest:euroncap -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no scraping
 *
 * Euro NCAP has no public API (robots.txt blocks /api/ anyway), so this discovers
 * every `/assessments/{make}/{model}/{id}/` URL from their sitemap.xml and parses
 * the server-rendered HTML of each (see euroncap-parse.ts). Unlike the CKAN
 * ingest, this never touches `registrations` — it only writes to its own table,
 * and is meant to be re-run every month or so to pick up new/updated ratings —
 * Euro NCAP publishes results in batches with no public advance schedule, so
 * there's nothing to poll against; re-running is just time-based, and cheap
 * since only genuinely new assessments hit the network (see caching below).
 *
 * Every fetched page is cached to scripts/.data/euroncap/ — a re-run without
 * --refresh reads from disk and makes no network requests at all, the same
 * caching discipline as the CKAN ZIPs in ingest.ts. Requests are throttled to
 * one per 1.5s with an identifying User-Agent — a few hundred pages, so a full
 * fresh run takes 15-25 minutes.
 *
 * `scripts/.data/euroncap/` is gitignored (machine-local working cache), so it
 * isn't how a fresh clone/VPS gets this data. `--export-csv` / `--from-csv`
 * round-trip the actual DB table through `scripts/seed-data/euroncap-ratings.csv.gz`
 * (committed, gzipped) — a new project loads real Euro NCAP data in seconds via
 * `pnpm ingest:euroncap:csv`, no scraping, no network at all. Re-export after
 * every real re-scrape to keep that file current for the next zero-project setup.
 *
 * `--from-csv` doesn't care whether the file is actually gzipped or not, or
 * whether its name matches: it tries the exact path first, then the other of
 * `.gz`/non-`.gz`, and decides gzip-or-plain by sniffing the file's own magic
 * bytes — so `--from-csv seed-data/euroncap-ratings.csv.gz` still works if
 * someone gunzipped that file in place to `.csv` (e.g. to eyeball/edit it).
 * `--export-csv` is simpler and just writes what you name: a `.gz` path comes
 * out gzipped, a plain `.csv` path comes out as text.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, euroncapRatings } from '@carplates/db'
import type { Db, EuroncapRatingInsert, EuroncapRatingRow } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'

import { parseAssessment } from './euroncap-parse.js'

const SITEMAP_URL = 'https://www.euroncap.com/sitemap.xml'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const REQUEST_DELAY_MS = 1500
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'euroncap')
const PROGRESS_EVERY = 25

// Sitemap URLs never carry query params, so this can't match the robots.txt-disallowed
// `/*?id=*` pattern — nothing else needs filtering out.
const ASSESSMENT_URL_RE = /https:\/\/www\.euroncap\.com\/assessments\/[^/"\s]+\/[^/"\s]+\/[^/"\s]+\/?/g

interface Args {
  limit?: number
  dryRun: boolean
  refresh: boolean
  exportCsv?: string
  fromCsv?: string
}

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false, refresh: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--limit') a.limit = Number(argv[++i])
    else if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--refresh') a.refresh = true
    else if (arg === '--export-csv') a.exportCsv = argv[++i]
    else if (arg === '--from-csv') a.fromCsv = argv[++i]
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

async function fetchAssessmentUrls(): Promise<string[]> {
  const res = await fetch(SITEMAP_URL, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`sitemap ${res.status}`)
  const xml = await res.text()
  return [...new Set([...xml.matchAll(ASSESSMENT_URL_RE)].map(m => m[0]))]
}

/** `{make}_{model}_{id}.html` — readable on disk, and unique per assessment. */
function cachePathFor(url: string): string {
  const parts = url.replace('https://www.euroncap.com/assessments/', '').replace(/\/+$/, '').split('/')
  return join(DATA_DIR, `${parts.join('_')}.html`)
}

/** Returns the HTML plus whether it came from disk (so the caller knows whether to throttle). */
async function fetchHtml(url: string, refresh: boolean): Promise<{ html: string; cached: boolean }> {
  const cachePath = cachePathFor(url)
  if (!refresh && existsSync(cachePath)) {
    return { html: await readFile(cachePath, 'utf8'), cached: true }
  }
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`status ${res.status}`)
  const html = await res.text()
  await writeFile(cachePath, html)
  return { html, cached: false }
}

async function upsert(db: Db, row: EuroncapRatingInsert): Promise<void> {
  const { assessmentId, ...rest } = row
  await db
    .insert(euroncapRatings)
    .values(row)
    .onConflictDoUpdate({ target: euroncapRatings.assessmentId, set: { ...rest, scrapedAt: new Date() } })
}

// Column order for the CSV round-trip. `images`/`youtube_ids` are JSON-encoded into a
// single cell — they're small nested structures, not tabular data of their own.
const CSV_COLUMNS = [
  'assessment_id',
  'url',
  'make',
  'model',
  'make_key',
  'model_key',
  'tested_variant',
  'body_type',
  'rating_year',
  'stars',
  'adult_occupant_pct',
  'child_occupant_pct',
  'vulnerable_road_users_pct',
  'safety_assist_pct',
  'safety_pack',
  'front_image_url',
  'images',
  'youtube_ids',
  'report_pdf_url',
  'scraped_at'
] as const

function rowToCsvRecord(row: EuroncapRatingRow): Record<(typeof CSV_COLUMNS)[number], string> {
  const n = (v: number | null): string => (v == null ? '' : String(v))
  return {
    assessment_id: row.assessmentId,
    url: row.url,
    make: row.make,
    model: row.model,
    make_key: row.makeKey,
    model_key: row.modelKey,
    tested_variant: row.testedVariant ?? '',
    body_type: row.bodyType ?? '',
    rating_year: n(row.ratingYear),
    stars: n(row.stars),
    adult_occupant_pct: n(row.adultOccupantPct),
    child_occupant_pct: n(row.childOccupantPct),
    vulnerable_road_users_pct: n(row.vulnerableRoadUsersPct),
    safety_assist_pct: n(row.safetyAssistPct),
    safety_pack: String(row.safetyPack),
    front_image_url: row.frontImageUrl ?? '',
    images: JSON.stringify(row.images),
    youtube_ids: JSON.stringify(row.youtubeIds),
    report_pdf_url: row.reportPdfUrl ?? '',
    scraped_at: row.scrapedAt.toISOString()
  }
}

function csvRecordToRow(rec: Record<string, string>): EuroncapRatingInsert {
  const n = (v: string | undefined): number | null => (!v ? null : Number(v))
  return {
    assessmentId: rec.assessment_id!,
    url: rec.url!,
    make: rec.make!,
    model: rec.model!,
    makeKey: rec.make_key!,
    modelKey: rec.model_key!,
    testedVariant: rec.tested_variant || null,
    bodyType: rec.body_type || null,
    ratingYear: n(rec.rating_year),
    stars: n(rec.stars),
    adultOccupantPct: n(rec.adult_occupant_pct),
    childOccupantPct: n(rec.child_occupant_pct),
    vulnerableRoadUsersPct: n(rec.vulnerable_road_users_pct),
    safetyAssistPct: n(rec.safety_assist_pct),
    safetyPack: rec.safety_pack === 'true',
    frontImageUrl: rec.front_image_url || null,
    images: JSON.parse(rec.images || '[]') as EuroncapRatingInsert['images'],
    youtubeIds: JSON.parse(rec.youtube_ids || '[]') as string[],
    reportPdfUrl: rec.report_pdf_url || null,
    scrapedAt: new Date(rec.scraped_at!)
  }
}

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db.select().from(euroncapRatings).orderBy(euroncapRatings.assessmentId)
  const csv = stringifyCsv(rows.map(rowToCsvRecord), { header: true, columns: [...CSV_COLUMNS] })
  await mkdir(dirname(path), { recursive: true })
  const output = path.endsWith('.gz') ? gzipSync(csv) : csv
  await writeFile(path, output)
  log(`exported ${rows.length} row(s) to ${path} (${(output.length / 1024).toFixed(0)} KB)`)
}

const GZIP_MAGIC_0 = 0x1f
const GZIP_MAGIC_1 = 0x8b

/**
 * Resolves `path` to whichever of it or its `.gz` ⟷ non-`.gz` sibling actually exists on
 * disk — so `--from-csv seed-data/euroncap-ratings.csv.gz` still works if someone gunzipped
 * it in place to `.csv` (or vice versa), without having to change the command.
 */
function resolveCsvPath(path: string): string {
  if (existsSync(path)) return path
  const alt = path.endsWith('.gz') ? path.slice(0, -'.gz'.length) : `${path}.gz`
  if (existsSync(alt)) return alt
  throw new Error(`neither "${path}" nor "${alt}" exists`)
}

async function importFromCsv(db: Db, requestedPath: string): Promise<void> {
  const path = resolveCsvPath(requestedPath)
  const raw = await readFile(path)
  // Sniff the actual gzip magic bytes rather than trust the extension — covers a file
  // renamed/re-saved without `.gz`, not just the two names `resolveCsvPath` already tries.
  const isGzip = raw[0] === GZIP_MAGIC_0 && raw[1] === GZIP_MAGIC_1
  const content = isGzip ? gunzipSync(raw).toString('utf8') : raw.toString('utf8')
  const records = parseCsv(content, { columns: true, trim: true }) as Record<string, string>[]
  for (const rec of records) await upsert(db, csvRecordToRow(rec))
  log(`imported ${records.length} row(s) from ${path}`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.exportCsv || args.fromCsv) {
    const { db, close } = createDb()
    try {
      if (args.exportCsv) await exportToCsv(db, args.exportCsv)
      else if (args.fromCsv) await importFromCsv(db, args.fromCsv)
    } finally {
      await close()
    }
    return
  }

  await mkdir(DATA_DIR, { recursive: true })

  log('fetching sitemap …')
  let urls = await fetchAssessmentUrls()
  log(`found ${urls.length} assessment URL(s) in the sitemap`)
  if (args.limit) urls = urls.slice(0, args.limit)

  const { db, close } = createDb()
  try {
    let written = 0
    let failed = 0
    for (const url of urls) {
      try {
        const { html, cached } = await fetchHtml(url, args.refresh)
        if (!cached) await sleep(REQUEST_DELAY_MS)

        const row = parseAssessment(html, url)
        if (!row) {
          log(`warn: not a recognizable assessment page — ${url}`)
          failed++
          continue
        }

        if (!args.dryRun) await upsert(db, row)
        written++
        if (written % PROGRESS_EVERY === 0) log(`  … ${written}/${urls.length} done`)
      } catch (err) {
        log(`warn: failed on ${url} — ${(err as Error).message}`)
        failed++
      }
    }
    log(
      `done: ${written} ${args.dryRun ? 'parsed (dry-run, not written)' : 'upserted'}, ${failed} failed, out of ${urls.length}`
    )
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
