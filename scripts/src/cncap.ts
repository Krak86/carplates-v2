/**
 * Ingest of c-ncap.org.cn's own JSON API into `registry.cncap_ratings`.
 *
 *   pnpm ingest:cncap                  # every record the API currently reports
 *   pnpm ingest:cncap -- --limit 20    # quick dev slice
 *   pnpm ingest:cncap -- --dry-run     # parse + count, write nothing
 *   pnpm ingest:cncap -- --refresh     # re-fetch pages already cached on disk
 *   pnpm ingest:cncap -- --export-csv ./x.csv[.gz]   # dump the current table, no fetching
 *   pnpm ingest:cncap -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no fetching
 *
 * Unlike Euro NCAP/JNCAP (both static/server-rendered HTML with no public API — see
 * euroncap.ts/jncap.ts), C-NCAP's results catalog is a clean JSON endpoint:
 * `POST /api/crashSearch` (form-encoded `pageNumber`/`pageSize`/`type=1` for the standard
 * C-NCAP program), confirmed live 2026-09-25. There's no HTML to parse and no detail-page
 * fetch — one record already carries everything (see cncap-parse.ts).
 *
 * C-NCAP's own data is Chinese-only — `carName` combines brand+model with no separator and no
 * consistent rule (a joint-venture prefix, a dropped brand, ...). `make`/`model` come from a
 * curated `carId -> {make, model}` table (cncap-names.ts) checked against this app's own
 * registry spellings, not a live/automatic translation — see PLAN.md's C-NCAP section for why.
 * A record whose `carId` isn't in that table yet is skipped with a warning, not guessed.
 *
 * Every fetched page is cached to scripts/.data/cncap/ (gitignored) — a re-run without
 * --refresh makes no network requests at all. `--export-csv`/`--from-csv` round-trip the
 * actual DB table through a committed, gzipped CSV for zero-scrape project setup, same as
 * Euro NCAP's/JNCAP's seed-data CSVs.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, cncapRatings } from '@carplates/db'
import type { CncapRatingInsert, CncapRatingRow, Db } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'

import { CNCAP_NAMES } from './cncap-names.js'
import { cncapApiRecordSchema, parseRecord } from './cncap-parse.js'
import type { CncapApiRecord } from './cncap-parse.js'

const BASE_URL = 'https://www.c-ncap.org.cn'
const SEARCH_PATH = '/api/crashSearch'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const REQUEST_DELAY_MS = 1500
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'cncap')
const PAGE_SIZE = 200
// `type=1` is the standard C-NCAP program (as opposed to C-GCAP/C-ICAP/CCRT, out of scope —
// see PLAN.md). Confirmed against the live search form 2026-09-25.
const SEARCH_TYPE = 1

interface CrashSearchResponse {
  error: number
  data: {
    total: number
    pages: number
    records: unknown[]
  }
}

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

/** Returns the page's JSON plus whether it came from disk (so the caller knows whether to throttle). */
async function fetchPage(pageNumber: number, refresh: boolean): Promise<{ json: CrashSearchResponse; cached: boolean }> {
  const cachePath = join(DATA_DIR, `page_${pageNumber}.json`)
  if (!refresh && existsSync(cachePath)) {
    return { json: JSON.parse(await readFile(cachePath, 'utf8')) as CrashSearchResponse, cached: true }
  }
  const body = `brandId=&ruleYear=&seriesId=&manufacturerId=&fuleKind=&categoryName=&keyword=&pageNumber=${pageNumber}&pageSize=${PAGE_SIZE}&type=${SEARCH_TYPE}`
  const res = await fetch(`${BASE_URL}${SEARCH_PATH}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'x-requested-with': 'XMLHttpRequest',
      'user-agent': USER_AGENT
    },
    body
  })
  if (!res.ok) throw new Error(`status ${res.status}`)
  const json = (await res.json()) as CrashSearchResponse
  if (json.error !== 0) throw new Error(`API error ${json.error}`)
  await mkdir(dirname(cachePath), { recursive: true })
  await writeFile(cachePath, JSON.stringify(json))
  return { json, cached: false }
}

/** Fetches every page of the results catalog, paginating until `pages` (from the first response) is exhausted. */
async function fetchAllRecords(refresh: boolean): Promise<CncapApiRecord[]> {
  const records: CncapApiRecord[] = []

  const { json: first, cached: firstCached } = await fetchPage(1, refresh)
  if (!firstCached) await sleep(REQUEST_DELAY_MS)
  records.push(...first.data.records.map(r => cncapApiRecordSchema.parse(r)))

  for (let page = 2; page <= first.data.pages; page++) {
    const { json, cached } = await fetchPage(page, refresh)
    if (!cached) await sleep(REQUEST_DELAY_MS)
    records.push(...json.data.records.map(r => cncapApiRecordSchema.parse(r)))
  }

  return records
}

async function upsert(db: Db, row: CncapRatingInsert): Promise<void> {
  const { assessmentId, ...rest } = row
  await db
    .insert(cncapRatings)
    .values(row)
    .onConflictDoUpdate({ target: cncapRatings.assessmentId, set: { ...rest, scrapedAt: new Date() } })
}

const CSV_COLUMNS = [
  'assessment_id',
  'car_id',
  'make',
  'model',
  'make_key',
  'model_key',
  'name_zh',
  'manufacturer_zh',
  'vehicle_class',
  'rating_year',
  'score_unit',
  'overall_score',
  'occupant_score',
  'vru_score',
  'active_safety_score',
  'scraped_at'
] as const

function rowToCsvRecord(row: CncapRatingRow): Record<(typeof CSV_COLUMNS)[number], string> {
  const n = (v: number | null): string => (v == null ? '' : String(v))
  return {
    assessment_id: row.assessmentId,
    car_id: String(row.carId),
    make: row.make,
    model: row.model,
    make_key: row.makeKey,
    model_key: row.modelKey,
    name_zh: row.nameZh,
    manufacturer_zh: row.manufacturerZh ?? '',
    vehicle_class: row.vehicleClass ?? '',
    rating_year: n(row.ratingYear),
    score_unit: row.scoreUnit,
    overall_score: n(row.overallScore),
    occupant_score: n(row.occupantScore),
    vru_score: n(row.vruScore),
    active_safety_score: n(row.activeSafetyScore),
    scraped_at: row.scrapedAt.toISOString()
  }
}

function csvRecordToRow(rec: Record<string, string>): CncapRatingInsert {
  const n = (v: string | undefined): number | null => (!v ? null : Number(v))
  return {
    assessmentId: rec.assessment_id!,
    carId: Number(rec.car_id),
    make: rec.make!,
    model: rec.model!,
    makeKey: rec.make_key!,
    modelKey: rec.model_key!,
    nameZh: rec.name_zh!,
    manufacturerZh: rec.manufacturer_zh || null,
    vehicleClass: rec.vehicle_class || null,
    ratingYear: n(rec.rating_year),
    scoreUnit: rec.score_unit as CncapRatingInsert['scoreUnit'],
    overallScore: n(rec.overall_score),
    occupantScore: n(rec.occupant_score),
    vruScore: n(rec.vru_score),
    activeSafetyScore: n(rec.active_safety_score),
    scrapedAt: new Date(rec.scraped_at!)
  }
}

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db.select().from(cncapRatings).orderBy(cncapRatings.assessmentId)
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

  log('fetching the results catalog …')
  let records = await fetchAllRecords(args.refresh)
  log(`found ${records.length} record(s)`)
  if (args.limit) records = records.slice(0, args.limit)

  const { db, close } = createDb()
  try {
    let written = 0
    let untranslated = 0
    const untranslatedIds: number[] = []
    for (const record of records) {
      const row = parseRecord(record, CNCAP_NAMES)
      if (!row) {
        untranslated++
        untranslatedIds.push(record.carId)
        continue
      }
      if (!args.dryRun) await upsert(db, row)
      written++
    }
    log(
      `done: ${written} ${args.dryRun ? 'parsed (dry-run, not written)' : 'upserted'}, ${untranslated} untranslated, out of ${records.length}`
    )
    if (untranslatedIds.length > 0) {
      log(`untranslated carId(s) — add these to cncap-names.ts: ${untranslatedIds.join(', ')}`)
    }
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
