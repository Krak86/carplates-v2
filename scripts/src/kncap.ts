/**
 * Ingest of kncap.org's own JSON API into `registry.kncap_ratings`.
 *
 *   pnpm ingest:kncap                  # every record the API currently reports
 *   pnpm ingest:kncap -- --limit 20    # quick dev slice
 *   pnpm ingest:kncap -- --dry-run     # parse + count, write nothing
 *   pnpm ingest:kncap -- --refresh     # re-fetch even if cached on disk
 *   pnpm ingest:kncap -- --export-csv ./x.csv[.gz]   # dump the current table, no fetching
 *   pnpm ingest:kncap -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no fetching
 *
 * Like C-NCAP (see cncap.ts), KNCAP has no documented public API, but its results page is
 * itself backed by a clean JSON endpoint: `POST /ncs/KncapResult/selectInitList.json` returns
 * every currently-listed assessment in one call, each row already carrying the full score
 * breakdown (crash/pedestrian/accident-prevention percentages + stars, overall score/class) —
 * no per-record detail-page fetch needed, confirmed live 2026-09-26.
 *
 * KNCAP's own "include old data" checkbox (`CHKOLD` in the request body) makes no difference
 * to what this endpoint returns — every value tried (`Y`/`ALL`/`1`/`true`) still returns the
 * same set. That set only covers 2021-current — KNCAP's individual assessment detail pages
 * (`GET /ncs/KncapResultDetail/initView.jsp?DETAIL_IDX=&DETAIL_YEAR=`) do go back further (real,
 * fully-populated pre-2021 records were confirmed live down to at least idx 4), but recovering
 * those needs a separate idx-by-idx brute-force sweep — not implemented here, see PLAN.md's
 * KNCAP section.
 *
 * KNCAP's own data is Korean-only — `COMPANY_NAME`/`BRAND_NAME` come from a curated
 * `idx -> {make, model}` table (kncap-names.ts) checked against this app's own registry
 * spellings, not a live/automatic translation. A record whose `IDX` isn't in that table yet is
 * skipped with a warning, not guessed — this is also how the one known junk/test row in
 * production (IDX 492) gets filtered out.
 *
 * The fetched response is cached to scripts/.data/kncap/ (gitignored) — a re-run without
 * --refresh makes no network requests at all. `--export-csv`/`--from-csv` round-trip the
 * actual DB table through a committed, gzipped CSV for zero-scrape project setup, same as
 * Euro NCAP's/JNCAP's/C-NCAP's seed-data CSVs.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, kncapRatings } from '@carplates/db'
import type { Db, KncapRatingInsert, KncapRatingRow } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'

import { KNCAP_NAMES } from './kncap-names.js'
import { kncapApiRecordSchema, parseRecord } from './kncap-parse.js'
import type { KncapApiRecord } from './kncap-parse.js'

const BASE_URL = 'https://www.kncap.org'
const LIST_PATH = '/ncs/KncapResult/selectInitList.json'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'kncap')

interface ListResponse {
  dsList: unknown[]
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

/** Fetches (or reads the cached copy of) every record the results catalog currently lists. */
async function fetchRecords(refresh: boolean): Promise<KncapApiRecord[]> {
  const cachePath = join(DATA_DIR, 'records.json')
  let json: ListResponse
  if (!refresh && existsSync(cachePath)) {
    json = JSON.parse(await readFile(cachePath, 'utf8')) as ListResponse
  } else {
    const res = await fetch(`${BASE_URL}${LIST_PATH}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        'user-agent': USER_AGENT
      },
      body: JSON.stringify({ requestParam: { HDN_KEYWORD: '', CHKOLD: '', DETAIL_IDX: '', DETAIL_YEAR: '', _menu_code_: '' } })
    })
    if (!res.ok) throw new Error(`status ${res.status}`)
    json = (await res.json()) as ListResponse
    await mkdir(dirname(cachePath), { recursive: true })
    await writeFile(cachePath, JSON.stringify(json))
  }
  return json.dsList.map(r => kncapApiRecordSchema.parse(r))
}

async function upsert(db: Db, row: KncapRatingInsert): Promise<void> {
  const { assessmentId, ...rest } = row
  await db
    .insert(kncapRatings)
    .values(row)
    .onConflictDoUpdate({ target: kncapRatings.assessmentId, set: { ...rest, scrapedAt: new Date() } })
}

const CSV_COLUMNS = [
  'assessment_id',
  'idx',
  'make',
  'model',
  'make_key',
  'model_key',
  'name_ko',
  'rating_year',
  'overall_score',
  'overall_class',
  'crash_pct',
  'crash_star',
  'pedestrian_pct',
  'pedestrian_star',
  'accident_pct',
  'accident_star',
  'image_url',
  'scraped_at'
] as const

function rowToCsvRecord(row: KncapRatingRow): Record<(typeof CSV_COLUMNS)[number], string> {
  const n = (v: number | null): string => (v == null ? '' : String(v))
  return {
    assessment_id: row.assessmentId,
    idx: String(row.idx),
    make: row.make,
    model: row.model,
    make_key: row.makeKey,
    model_key: row.modelKey,
    name_ko: row.nameKo,
    rating_year: n(row.ratingYear),
    overall_score: n(row.overallScore),
    overall_class: n(row.overallClass),
    crash_pct: n(row.crashPct),
    crash_star: n(row.crashStar),
    pedestrian_pct: n(row.pedestrianPct),
    pedestrian_star: n(row.pedestrianStar),
    accident_pct: n(row.accidentPct),
    accident_star: n(row.accidentStar),
    image_url: row.imageUrl ?? '',
    scraped_at: row.scrapedAt.toISOString()
  }
}

function csvRecordToRow(rec: Record<string, string>): KncapRatingInsert {
  const n = (v: string | undefined): number | null => (!v ? null : Number(v))
  return {
    assessmentId: rec.assessment_id!,
    idx: Number(rec.idx),
    make: rec.make!,
    model: rec.model!,
    makeKey: rec.make_key!,
    modelKey: rec.model_key!,
    nameKo: rec.name_ko!,
    ratingYear: n(rec.rating_year),
    overallScore: n(rec.overall_score),
    overallClass: n(rec.overall_class),
    crashPct: n(rec.crash_pct),
    crashStar: n(rec.crash_star),
    pedestrianPct: n(rec.pedestrian_pct),
    pedestrianStar: n(rec.pedestrian_star),
    accidentPct: n(rec.accident_pct),
    accidentStar: n(rec.accident_star),
    imageUrl: rec.image_url || null,
    scrapedAt: new Date(rec.scraped_at!)
  }
}

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db.select().from(kncapRatings).orderBy(kncapRatings.idx)
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
  let records = await fetchRecords(args.refresh)
  log(`found ${records.length} record(s)`)
  if (args.limit) records = records.slice(0, args.limit)

  const { db, close } = createDb()
  try {
    let written = 0
    let untranslated = 0
    const untranslatedIdx: number[] = []
    for (const record of records) {
      const row = parseRecord(record, KNCAP_NAMES)
      if (!row) {
        untranslated++
        untranslatedIdx.push(record.IDX)
        continue
      }
      if (!args.dryRun) await upsert(db, row)
      written++
    }
    log(
      `done: ${written} ${args.dryRun ? 'parsed (dry-run, not written)' : 'upserted'}, ${untranslated} untranslated, out of ${records.length}`
    )
    if (untranslatedIdx.length > 0) {
      log(`untranslated idx(es) — add these to kncap-names.ts: ${untranslatedIdx.join(', ')}`)
    }
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
