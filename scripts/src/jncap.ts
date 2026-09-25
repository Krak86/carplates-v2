/**
 * Offline scrape of nasva.go.jp's English JNCAP mirror into `registry.jncap_ratings`.
 *
 *   pnpm ingest:jncap                  # every assessment discoverable via the results catalog
 *   pnpm ingest:jncap -- --limit 20    # quick dev slice
 *   pnpm ingest:jncap -- --dry-run     # parse + count, write nothing
 *   pnpm ingest:jncap -- --refresh     # re-fetch pages already cached on disk
 *   pnpm ingest:jncap -- --export-csv ./x.csv[.gz]   # dump the current table, no scraping
 *   pnpm ingest:jncap -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no scraping
 *   pnpm ingest:jncap -- --ids-file ./ids.json       # skip discovery, parse exactly these ids
 *                                                     # (a JSON array of id strings) — useful for
 *                                                     # re-parsing a known set without a fresh
 *                                                     # discovery crawl, or supplying ids found
 *                                                     # some other way (e.g. NASVA's own Excel).
 *
 * JNCAP (run by NASVA) has no public API, same as Euro NCAP — see scripts/src/euroncap.ts for
 * the sibling scraper this one mirrors. Unlike Euro NCAP's sitemap, there's no single index of
 * every assessment: this instead paginates the results catalog
 * (`/mamoru/en/assessment_car/list/{page}?testfy={code}`) once per `testfy` code (see
 * `TESTFY_CODES` below — NOT a bare year; confirmed against the live site's own search form)
 * collecting every `/assessment_car/detail/{id}` link, then parses each detail page (see
 * jncap-parse.ts). Every fetched page — both list pages and detail pages — is cached to
 * scripts/.data/jncap/, same caching discipline as euroncap.ts: a re-run without --refresh
 * makes no network requests at all. Requests are throttled to one per 1.5s.
 *
 * `scripts/.data/jncap/` is gitignored (machine-local cache) — `--export-csv`/`--from-csv`
 * round-trip the actual DB table through a committed, gzipped CSV for zero-scrape project
 * setup, same as Euro NCAP's `seed-data/euroncap-ratings.csv.gz`.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, jncapRatings } from '@carplates/db'
import type { Db, JncapRatingInsert, JncapRatingRow } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'

import { parseAssessment } from './jncap-parse.js'

const BASE_URL = 'https://www.nasva.go.jp'
const LIST_PATH = '/mamoru/en/assessment_car/list'
const DETAIL_PATH = '/mamoru/en/assessment_car/detail'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const REQUEST_DELAY_MS = 1500
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'jncap')
const PROGRESS_EVERY = 25
// Safety cap on pages-per-code — JNCAP publishes ~15-25 assessments/year, nowhere near enough
// to fill this many pages; it only guards against an unexpected pagination loop.
const MAX_LIST_PAGES_PER_CODE = 50

const DETAIL_ID_RE = /\/mamoru\/en\/assessment_car\/detail\/(\d+)/g

/**
 * The `testfy` filter's real values, confirmed 2026-09-25 from the live search form's own
 * `<select name="testfy">` — NOT a bare year. JNCAP's own program structure changed over time:
 * FY2020+ is a single combined "Vehicle safety performance" round per year (`<year>S`); FY2014-
 * 2019 ran Preventive ("A") and Collision ("P") as two separate rounds per year; before 2014
 * Preventive testing didn't exist yet, so only "P" appears. This exact list (including the
 * gaps — no 2004-2006, 2008) is what the live dropdown offers, not an assumption. Extended with
 * `<year>S` for any fiscal year after 2025, following the pattern every year since 2020 has
 * used — re-verify against the live form if that assumption ever stops holding.
 */
const KNOWN_TESTFY_CODES = [
  '2025S',
  '2024S',
  '2023S',
  '2022S',
  '2021S',
  '2020S',
  '2019A',
  '2019P',
  '2018A',
  '2018P',
  '2017A',
  '2017P',
  '2016A',
  '2016P',
  '2015A',
  '2015P',
  '2014A',
  '2014P',
  '2013P',
  '2012P',
  '2011P',
  '2010P',
  '2009P',
  '2007P',
  '2003P'
] as const
const LAST_KNOWN_S_YEAR = 2025

function testfyCodes(): string[] {
  const currentYear = new Date().getFullYear()
  const futureYears = []
  for (let year = LAST_KNOWN_S_YEAR + 1; year <= currentYear; year++) futureYears.push(`${year}S`)
  return [...futureYears, ...KNOWN_TESTFY_CODES]
}

interface Args {
  limit?: number
  dryRun: boolean
  refresh: boolean
  exportCsv?: string
  fromCsv?: string
  idsFile?: string
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
    else if (arg === '--ids-file') a.idsFile = argv[++i]
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/** Returns the HTML plus whether it came from disk (so the caller knows whether to throttle). */
async function fetchHtml(url: string, cachePath: string, refresh: boolean): Promise<{ html: string; cached: boolean }> {
  if (!refresh && existsSync(cachePath)) {
    return { html: await readFile(cachePath, 'utf8'), cached: true }
  }
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`status ${res.status}`)
  const html = await res.text()
  await mkdir(dirname(cachePath), { recursive: true })
  await writeFile(cachePath, html)
  return { html, cached: false }
}

/**
 * Discovers every assessment id by paginating the results catalog once per `testfy` code —
 * there's no sitemap or single index the way Euro NCAP has. Stops a code's pagination as soon
 * as a page yields zero detail links, and moves to the next code.
 */
async function fetchAssessmentIds(refresh: boolean): Promise<string[]> {
  const ids = new Set<string>()

  for (const code of testfyCodes()) {
    for (let page = 1; page <= MAX_LIST_PAGES_PER_CODE; page++) {
      const url = `${BASE_URL}${LIST_PATH}/${page}?brand_id=&model_id=&type_id=&keyword=&testfy=${code}`
      const cachePath = join(DATA_DIR, 'list', `${code}_${page}.html`)
      const { html, cached } = await fetchHtml(url, cachePath, refresh)
      if (!cached) await sleep(REQUEST_DELAY_MS)

      const found = [...html.matchAll(DETAIL_ID_RE)].map(m => m[1]!)
      if (found.length === 0) break
      found.forEach(id => ids.add(id))
    }
  }

  return [...ids].sort((a, b) => Number(a) - Number(b))
}

async function upsert(db: Db, row: JncapRatingInsert): Promise<void> {
  const { assessmentId, ...rest } = row
  await db
    .insert(jncapRatings)
    .values(row)
    .onConflictDoUpdate({ target: jncapRatings.assessmentId, set: { ...rest, scrapedAt: new Date() } })
}

// Column order for the CSV round-trip. `test_scores` is JSON-encoded into a single cell —
// it's a small nested structure, not tabular data of its own.
const CSV_COLUMNS = [
  'assessment_id',
  'url',
  'make',
  'model',
  'make_key',
  'model_key',
  'vehicle_type',
  'rating_year',
  'stars',
  'overall_pct',
  'preventive_rank',
  'preventive_pct',
  'collision_rank',
  'collision_pct',
  'emergency_call_type',
  'emergency_call_pct',
  'test_scores',
  'image_url',
  'youtube_id',
  'report_pdf_url',
  'scraped_at'
] as const

function rowToCsvRecord(row: JncapRatingRow): Record<(typeof CSV_COLUMNS)[number], string> {
  const n = (v: number | null): string => (v == null ? '' : String(v))
  return {
    assessment_id: row.assessmentId,
    url: row.url,
    make: row.make,
    model: row.model,
    make_key: row.makeKey,
    model_key: row.modelKey,
    vehicle_type: row.vehicleType ?? '',
    rating_year: n(row.ratingYear),
    stars: n(row.stars),
    overall_pct: n(row.overallPct),
    preventive_rank: row.preventiveRank ?? '',
    preventive_pct: n(row.preventivePct),
    collision_rank: row.collisionRank ?? '',
    collision_pct: n(row.collisionPct),
    emergency_call_type: row.emergencyCallType ?? '',
    emergency_call_pct: n(row.emergencyCallPct),
    test_scores: JSON.stringify(row.testScores),
    image_url: row.imageUrl ?? '',
    youtube_id: row.youtubeId ?? '',
    report_pdf_url: row.reportPdfUrl ?? '',
    scraped_at: row.scrapedAt.toISOString()
  }
}

function csvRecordToRow(rec: Record<string, string>): JncapRatingInsert {
  const n = (v: string | undefined): number | null => (!v ? null : Number(v))
  return {
    assessmentId: rec.assessment_id!,
    url: rec.url!,
    make: rec.make!,
    model: rec.model!,
    makeKey: rec.make_key!,
    modelKey: rec.model_key!,
    vehicleType: rec.vehicle_type || null,
    ratingYear: n(rec.rating_year),
    stars: n(rec.stars),
    overallPct: n(rec.overall_pct),
    preventiveRank: rec.preventive_rank || null,
    preventivePct: n(rec.preventive_pct),
    collisionRank: rec.collision_rank || null,
    collisionPct: n(rec.collision_pct),
    emergencyCallType: rec.emergency_call_type || null,
    emergencyCallPct: n(rec.emergency_call_pct),
    testScores: JSON.parse(rec.test_scores || '[]') as JncapRatingInsert['testScores'],
    imageUrl: rec.image_url || null,
    youtubeId: rec.youtube_id || null,
    reportPdfUrl: rec.report_pdf_url || null,
    scrapedAt: new Date(rec.scraped_at!)
  }
}

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db.select().from(jncapRatings).orderBy(jncapRatings.assessmentId)
  const csv = stringifyCsv(rows.map(rowToCsvRecord), { header: true, columns: [...CSV_COLUMNS] })
  await mkdir(dirname(path), { recursive: true })
  const output = path.endsWith('.gz') ? gzipSync(csv) : csv
  await writeFile(path, output)
  log(`exported ${rows.length} row(s) to ${path} (${(output.length / 1024).toFixed(0)} KB)`)
}

const GZIP_MAGIC_0 = 0x1f
const GZIP_MAGIC_1 = 0x8b

/**
 * Resolves `path` to whichever of it or its `.gz` ⟷ non-`.gz` sibling actually exists on disk
 * — same convenience as euroncap.ts's `resolveCsvPath`.
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

  let ids: string[]
  if (args.idsFile) {
    ids = JSON.parse(await readFile(args.idsFile, 'utf8')) as string[]
    log(`loaded ${ids.length} assessment id(s) from ${args.idsFile}`)
  } else {
    log('paginating the results catalog by fiscal year …')
    ids = await fetchAssessmentIds(args.refresh)
    log(`found ${ids.length} assessment id(s)`)
  }
  if (args.limit) ids = ids.slice(0, args.limit)

  const { db, close } = createDb()
  try {
    let written = 0
    let failed = 0
    for (const id of ids) {
      const url = `${BASE_URL}${DETAIL_PATH}/${id}`
      try {
        const cachePath = join(DATA_DIR, 'detail', `${id}.html`)
        const { html, cached } = await fetchHtml(url, cachePath, args.refresh)
        if (!cached) await sleep(REQUEST_DELAY_MS)

        const row = parseAssessment(html, url, id)
        if (!row) {
          log(`warn: not a recognizable assessment page — ${url}`)
          failed++
          continue
        }

        if (!args.dryRun) await upsert(db, row)
        written++
        if (written % PROGRESS_EVERY === 0) log(`  … ${written}/${ids.length} done`)
      } catch (err) {
        log(`warn: failed on ${url} — ${(err as Error).message}`)
        failed++
      }
    }
    log(
      `done: ${written} ${args.dryRun ? 'parsed (dry-run, not written)' : 'upserted'}, ${failed} failed, out of ${ids.length}`
    )
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
