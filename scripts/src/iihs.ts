/**
 * Offline scrape of iihs.org's server-rendered vehicle rating pages into `registry.iihs_ratings`.
 *
 *   pnpm ingest:iihs                        # every page listed in iihs.org's own sitemap.xml
 *   pnpm ingest:iihs -- --limit 30          # quick dev slice
 *   pnpm ingest:iihs -- --dry-run           # parse + count, write nothing
 *   pnpm ingest:iihs -- --refresh           # re-fetch every page already cached on disk
 *   pnpm ingest:iihs -- --refresh-from 2025 # re-fetch only cached pages for model year >= 2025 —
 *                                           # the cheap annual update, since IIHS revises current-
 *                                           # year ratings mid-season; older years rarely change
 *   pnpm ingest:iihs -- --export-csv ./x.csv[.gz]   # dump the current table, no scraping
 *   pnpm ingest:iihs -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no scraping
 *
 * IIHS has no documented public API and no bulk data export (`/topics/data` 404s) — but unlike
 * Euro NCAP/JNCAP/C-NCAP/KNCAP, it doesn't need a search sweep or pagination to discover the
 * vehicle universe either: `https://www.iihs.org/sitemap.xml` lists every `/ratings/vehicle/
 * {make}/{variant}/{year}` page directly (confirmed live 2026-09-26: 6,023 pages, 660 make/
 * variant combos, model years 1994-2027). Each page is server-rendered HTML with no JSON to
 * parse instead (see iihs-parse.ts) — the only JSON endpoint on the site, /api/ratings/variant-
 * lookup, gives make/model/year existence, never the actual ratings.
 *
 * Every fetched page is cached to scripts/.data/iihs/ (gitignored), same discipline as jncap.ts/
 * cncap.ts: a re-run without --refresh makes no network requests at all. Requests are throttled
 * to one per 1.5s — courtesy to iihs.org, not a rate limit actually observed.
 *
 * `--export-csv`/`--from-csv` round-trip the actual DB table through a committed, gzipped CSV
 * for zero-scrape project setup, same as the other four sources' seed-data CSVs.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, iihsRatings } from '@carplates/db'
import type { Db, IihsRatingInsert, IihsRatingRow } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'

import { parseVehiclePage } from './iihs-parse.js'

const BASE_URL = 'https://www.iihs.org'
const SITEMAP_PATH = '/sitemap.xml'
const VEHICLE_PATH_PREFIX = '/ratings/vehicle/'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const REQUEST_DELAY_MS = 1500
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'iihs')
const PROGRESS_EVERY = 100
// A real full run (2026-09-26) hit a sharp transition from 100% success to ~100% "fetch failed"
// partway through — not a permanent block (a standalone retry moments later succeeded fine), but
// long enough to need real retries rather than a single attempt. Per-request retries absorb a
// brief blip; the end-of-run retry pass (see `main`) absorbs a longer one without losing the rest
// of an hours-long scrape to it.
const MAX_ATTEMPTS = 4
const RETRY_BASE_DELAY_MS = 2000
const END_OF_RUN_RETRY_COOLDOWN_MS = 60_000

const LOC_RE = /<loc>([^<]+)<\/loc>/g

interface Args {
  limit?: number
  dryRun: boolean
  refresh: boolean
  refreshFrom?: number
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
    else if (arg === '--refresh-from') a.refreshFrom = Number(argv[++i])
    else if (arg === '--export-csv') a.exportCsv = argv[++i]
    else if (arg === '--from-csv') a.fromCsv = argv[++i]
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/** "1h 23m 45s" (or "45s" for anything under a minute) — for the run's own start/elapsed reporting. */
function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours > 0 ? `${hours}h` : null, minutes > 0 ? `${minutes}m` : null, `${seconds}s`].filter(Boolean).join(' ')
}

/** Every `/ratings/vehicle/{make}/{variant}/{year}` path listed in iihs.org's own sitemap. */
async function fetchVehiclePaths(refresh: boolean): Promise<string[]> {
  const cachePath = join(DATA_DIR, 'sitemap.xml')
  let xml: string
  if (!refresh && existsSync(cachePath)) {
    xml = await readFile(cachePath, 'utf8')
  } else {
    const res = await fetch(`${BASE_URL}${SITEMAP_PATH}`, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) throw new Error(`status ${res.status}`)
    xml = await res.text()
    await mkdir(dirname(cachePath), { recursive: true })
    await writeFile(cachePath, xml)
  }

  // Decoded to a plain-text path ("alfa romeo/giulia-4-door-sedan/2026") — the sitemap encodes a
  // space-containing make slug as "alfa%20romeo" (confirmed live 2026-09-26), and the raw percent
  // sequence would otherwise survive into makeKey()'s alnum-only normalization as stray digits
  // ("20"), breaking the match against the page's own "Alfa Romeo" text. Re-encoded per segment
  // in fetchUrlFor() below when actually requesting the page.
  const paths = [...xml.matchAll(LOC_RE)]
    .map(m => new URL(m[1]!).pathname)
    .filter(p => p.startsWith(VEHICLE_PATH_PREFIX))
    .map(p => decodeURIComponent(p.slice(VEHICLE_PATH_PREFIX.length).replace(/\/$/, '')))

  return [...new Set(paths)].sort()
}

/** Re-encodes a decoded urlPath's segments for the actual request — the inverse of the decode in `fetchVehiclePaths`. */
function fetchUrlFor(urlPath: string): string {
  return `${BASE_URL}${VEHICLE_PATH_PREFIX}${urlPath.split('/').map(encodeURIComponent).join('/')}`
}

/**
 * Returns the HTML plus whether it came from disk (so the caller knows whether to throttle).
 * Retries a real network fetch up to `MAX_ATTEMPTS` times with a growing delay — a lone request
 * failure is treated as transient, not a reason to drop that page for the whole run.
 */
async function fetchHtml(
  url: string,
  cachePath: string,
  refresh: boolean
): Promise<{ html: string; cached: boolean }> {
  if (!refresh && existsSync(cachePath)) {
    return { html: await readFile(cachePath, 'utf8'), cached: true }
  }

  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const html = await res.text()
      await mkdir(dirname(cachePath), { recursive: true })
      await writeFile(cachePath, html)
      return { html, cached: false }
    } catch (err) {
      lastErr = err
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_BASE_DELAY_MS * attempt)
    }
  }
  throw lastErr
}

function shouldRefresh(urlPath: string, args: Args): boolean {
  if (args.refresh) return true
  if (args.refreshFrom == null) return false
  const year = Number(urlPath.split('/').pop())
  return Number.isInteger(year) && year >= args.refreshFrom
}

async function upsert(db: Db, row: IihsRatingInsert): Promise<void> {
  const { assessmentId, ...rest } = row
  await db
    .insert(iihsRatings)
    .values(row)
    .onConflictDoUpdate({ target: iihsRatings.assessmentId, set: { ...rest, scrapedAt: new Date() } })
}

// Column order for the CSV round-trip. `tests` is JSON-encoded into a single cell — a small
// nested structure, not tabular data of its own, same treatment as JNCAP's `test_scores`.
const CSV_COLUMNS = [
  'assessment_id',
  'make',
  'model',
  'make_key',
  'model_key',
  'variant_type',
  'vehicle_class',
  'model_year',
  'award',
  'tests',
  'image_url',
  'scraped_at'
] as const

function rowToCsvRecord(row: IihsRatingRow): Record<(typeof CSV_COLUMNS)[number], string> {
  return {
    assessment_id: row.assessmentId,
    make: row.make,
    model: row.model,
    make_key: row.makeKey,
    model_key: row.modelKey,
    variant_type: row.variantType,
    vehicle_class: row.vehicleClass ?? '',
    model_year: String(row.modelYear),
    award: row.award ?? '',
    tests: JSON.stringify(row.tests),
    image_url: row.imageUrl ?? '',
    scraped_at: row.scrapedAt.toISOString()
  }
}

function csvRecordToRow(rec: Record<string, string>): IihsRatingInsert {
  return {
    assessmentId: rec.assessment_id!,
    make: rec.make!,
    model: rec.model!,
    makeKey: rec.make_key!,
    modelKey: rec.model_key!,
    variantType: rec.variant_type!,
    vehicleClass: rec.vehicle_class || null,
    modelYear: Number(rec.model_year),
    award: rec.award || null,
    tests: JSON.parse(rec.tests || '[]') as IihsRatingInsert['tests'],
    imageUrl: rec.image_url || null,
    scrapedAt: new Date(rec.scraped_at!)
  }
}

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db.select().from(iihsRatings).orderBy(iihsRatings.assessmentId)
  const csv = stringifyCsv(rows.map(rowToCsvRecord), { header: true, columns: [...CSV_COLUMNS] })
  await mkdir(dirname(path), { recursive: true })
  const output = path.endsWith('.gz') ? gzipSync(csv) : csv
  await writeFile(path, output)
  log(`exported ${rows.length} row(s) to ${path} (${(output.length / 1024).toFixed(0)} KB)`)
}

const GZIP_MAGIC_0 = 0x1f
const GZIP_MAGIC_1 = 0x8b

/** Resolves `path` to whichever of it or its `.gz` ⟷ non-`.gz` sibling actually exists on disk. */
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

type Outcome = 'written' | 'unrecognized' | 'network-error'

/** Fetches, parses, and (unless `--dry-run`) upserts one vehicle page. Never throws. */
async function processPath(db: Db, urlPath: string, args: Args): Promise<Outcome> {
  const url = fetchUrlFor(urlPath)
  let html: string
  let cached: boolean
  try {
    const cachePath = join(DATA_DIR, 'vehicle', `${urlPath}.html`)
    ;({ html, cached } = await fetchHtml(url, cachePath, shouldRefresh(urlPath, args)))
  } catch (err) {
    log(`warn: failed on ${url} — ${(err as Error).message}`)
    return 'network-error'
  }
  if (!cached) await sleep(REQUEST_DELAY_MS)

  const row = parseVehiclePage(html, urlPath)
  if (!row) {
    log(`warn: not a recognizable vehicle page — ${url}`)
    return 'unrecognized'
  }

  if (!args.dryRun) await upsert(db, row)
  return 'written'
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

  const startedAt = Date.now()
  log(`started ${new Date(startedAt).toISOString()}`)

  log('fetching the sitemap …')
  let paths = await fetchVehiclePaths(args.refresh)
  log(`found ${paths.length} vehicle page(s)`)
  if (args.limit) paths = paths.slice(0, args.limit)

  const { db, close } = createDb()
  try {
    let written = 0
    let unrecognized = 0
    let networkFailed: string[] = []

    for (const urlPath of paths) {
      const outcome = await processPath(db, urlPath, args)
      if (outcome === 'written') {
        written++
        if (written % PROGRESS_EVERY === 0) {
          log(`  … ${written}/${paths.length} done (${formatDuration(Date.now() - startedAt)} elapsed)`)
        }
      } else if (outcome === 'unrecognized') {
        unrecognized++
      } else {
        networkFailed.push(urlPath)
      }
    }

    // A real full run (2026-09-26) hit a sustained stretch of network failures partway through
    // that a standalone retry moments later didn't reproduce — one cooldown-and-retry pass over
    // just the failures recovers from that without re-running the whole (hours-long) scrape.
    if (networkFailed.length > 0) {
      log(`${networkFailed.length} page(s) hit a network error — retrying once after a cooldown …`)
      await sleep(END_OF_RUN_RETRY_COOLDOWN_MS)
      const stillFailed: string[] = []
      for (const urlPath of networkFailed) {
        const outcome = await processPath(db, urlPath, args)
        if (outcome === 'written') written++
        else if (outcome === 'unrecognized') unrecognized++
        else stillFailed.push(urlPath)
      }
      networkFailed = stillFailed
    }

    log(
      `done: ${written} ${args.dryRun ? 'parsed (dry-run, not written)' : 'upserted'}, ${unrecognized} unrecognized, ${networkFailed.length} network-failed, out of ${paths.length} (${formatDuration(Date.now() - startedAt)} total)`
    )
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
