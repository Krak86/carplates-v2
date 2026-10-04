/**
 * Search of Sketchfab's public Data API for 3D models of each catalogued make/model into `registry.car_models_3d`, so a
 * result card can offer a "3D view" modal (see PLAN.md). Facts + links only — the model is embedded from Sketchfab's own
 * viewer iframe on click, never downloaded or re-hosted, and the author/licence credit is shown with it.
 *
 *   pnpm ingest:sketchfab                          # every make/model of the infocar catalog (~25 min cold)
 *   pnpm ingest:sketchfab -- --brand kia           # one brand slug (repeatable)
 *   pnpm ingest:sketchfab -- --brand kia --model ceed   # one model slug
 *   pnpm ingest:sketchfab -- --limit 20            # first N make/models, for a trial run
 *   pnpm ingest:sketchfab -- --dry-run             # search + parse + count, write nothing to the DB
 *   pnpm ingest:sketchfab -- --refresh             # re-run searches even if cached on disk
 *   pnpm ingest:sketchfab -- --export-csv ./x.csv[.gz]   # dump the current table, no fetching
 *   pnpm ingest:sketchfab -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no fetching
 *
 * The make/model list is the infocar catalog already in the DB (`pnpm ingest:infocar[:csv]` first). One search per
 * make/model (`/v3/search?type=models&categories=cars-vehicles&embeddable=true`, most-liked first, anonymous), ≤1
 * request/s, raw JSON cached to scripts/.data/sketchfab/ (gitignored). Only hits whose TITLE names the brand and every
 * word of the model are kept (see sketchfab-parse.ts). Anonymous searches hit a per-IP rate limit after ~1000 requests;
 * set `SKETCHFAB_TOKEN` (a free Sketchfab API token, in apps/api/.env — loaded by the npm script) to search as an account. Rows are upserted by Sketchfab uid; a model found under several
 * make/models keeps the first.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { carModels3d, createDb, infocarVersions } from '@carplates/db'
import type { CarModel3dInsert, CarModel3dRow, Db } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import { sql } from 'drizzle-orm'

import { brandNames, parseSearch } from './sketchfab-parse.js'

const API = 'https://api.sketchfab.com/v3/search'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'sketchfab')
const MIN_INTERVAL_MS = 1500
const RATE_LIMIT_BASE_S = 60
const MAX_RATE_LIMIT_RETRIES = 4
const PER_SEARCH = 24

const log = (...m: unknown[]): void => {
  console.log(...m)
}

type Args = {
  brands: string[]
  models: string[]
  limit?: number
  dryRun: boolean
  refresh: boolean
  exportCsv?: string
  fromCsv?: string
}

function parseArgs(argv: string[]): Args {
  const a: Args = { brands: [], models: [], dryRun: false, refresh: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--brand') a.brands.push(argv[++i]!)
    else if (arg === '--model') a.models.push(argv[++i]!)
    else if (arg === '--limit') a.limit = Number(argv[++i])
    else if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--refresh') a.refresh = true
    else if (arg === '--export-csv') a.exportCsv = argv[++i]
    else if (arg === '--from-csv') a.fromCsv = argv[++i]
  }
  return a
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

class RateLimitedError extends Error {
  constructor() {
    super('Sketchfab keeps answering 429 (anonymous rate limit)')
  }
}

let lastRequestAt = 0

/** Polite fetch: at most one request per MIN_INTERVAL_MS. */
async function throttledFetch(url: string): Promise<Response> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()
  const headers: Record<string, string> = { 'user-agent': USER_AGENT, accept: 'application/json' }
  // Optional: authenticated requests are counted per account and get a far higher limit than anonymous (per-IP) ones.
  if (process.env.SKETCHFAB_TOKEN) headers.authorization = `Token ${process.env.SKETCHFAB_TOKEN}`
  return fetch(url, { headers })
}

/**
 * One cached search (raw JSON), or `null` when it keeps failing (skipped, re-run to retry). Throws `RateLimitedError`
 * once Sketchfab's 429 outlasts the backoff — the caller stops the run and a later re-run resumes from the cache.
 */
async function search(brandSlug: string, modelSlug: string, modelName: string, refresh: boolean): Promise<unknown> {
  const cachePath = join(DATA_DIR, `${brandSlug}__${modelSlug}.json`)
  if (!refresh && existsSync(cachePath)) return JSON.parse(await readFile(cachePath, 'utf8')) as unknown

  const q = `${brandNames(brandSlug)[0]} ${modelName}`
  const params = new URLSearchParams({
    type: 'models',
    q,
    categories: 'cars-vehicles',
    embeddable: 'true',
    sort_by: '-likeCount',
    count: String(PER_SEARCH)
  })
  let failures = 0
  let rateLimits = 0
  for (;;) {
    try {
      const res = await throttledFetch(`${API}?${params.toString()}`)
      if (res.status === 429) {
        // Anonymous quota (seen after ~1000 requests in ~16 min), no Retry-After sent. Never skip the model over it
        // and don't keep hammering: back off 1, 2, 4, 8 min, then stop the run — the disk cache makes a re-run resume.
        if (++rateLimits > MAX_RATE_LIMIT_RETRIES) throw new RateLimitedError()
        const retry = Number(res.headers.get('retry-after')) || RATE_LIMIT_BASE_S * 2 ** (rateLimits - 1)
        log(`  rate-limited, waiting ${retry}s (${rateLimits}/${MAX_RATE_LIMIT_RETRIES})`)
        await sleep(retry * 1000)
        continue
      }
      if (!res.ok) throw new Error(`status ${res.status}`)
      const json = (await res.json()) as unknown
      await mkdir(dirname(cachePath), { recursive: true })
      await writeFile(cachePath, JSON.stringify(json))
      return json
    } catch (err) {
      if (err instanceof RateLimitedError) throw err
      if (++failures >= 3) {
        log(`  "${q}": giving up after ${failures} attempts (${String(err)}) — skipped, re-run to retry`)
        return null
      }
      await sleep(failures * 3000)
    }
  }
}

type CatalogModel = { brandSlug: string; modelSlug: string; modelName: string }

/** Distinct make/models of the infocar catalog (both trees), by brand then model. */
async function loadCatalog(db: Db): Promise<CatalogModel[]> {
  return db
    .selectDistinct({
      brandSlug: infocarVersions.brandSlug,
      modelSlug: infocarVersions.modelSlug,
      modelName: infocarVersions.modelName
    })
    .from(infocarVersions)
    .orderBy(infocarVersions.brandSlug, infocarVersions.modelSlug)
}

async function upsert(db: Db, rows: CarModel3dInsert[]): Promise<void> {
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(carModels3d)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: carModels3d.uid,
        set: {
          name: sql`excluded.name`,
          year: sql`excluded.year`,
          authorName: sql`excluded.author_name`,
          authorUrl: sql`excluded.author_url`,
          thumbUrl: sql`excluded.thumb_url`,
          viewCount: sql`excluded.view_count`,
          likeCount: sql`excluded.like_count`,
          license: sql`excluded.license`,
          publishedAt: sql`excluded.published_at`,
          fetchedAt: sql`now()`
        }
      })
  }
}

const CSV_COLUMNS = [
  'uid',
  'name',
  'brand_slug',
  'model_slug',
  'model_name',
  'year',
  'author_name',
  'author_url',
  'thumb_url',
  'view_count',
  'like_count',
  'license',
  'published_at',
  'fetched_at'
] as const

function rowToCsvRecord(row: CarModel3dRow): Record<(typeof CSV_COLUMNS)[number], string> {
  return {
    uid: row.uid,
    name: row.name,
    brand_slug: row.brandSlug,
    model_slug: row.modelSlug,
    model_name: row.modelName,
    year: row.year == null ? '' : String(row.year),
    author_name: row.authorName,
    author_url: row.authorUrl,
    thumb_url: row.thumbUrl ?? '',
    view_count: String(row.viewCount),
    like_count: String(row.likeCount),
    license: row.license ?? '',
    published_at: row.publishedAt ?? '',
    fetched_at: row.fetchedAt.toISOString()
  }
}

function csvRecordToRow(rec: Record<string, string>): CarModel3dInsert {
  return {
    uid: rec.uid!,
    name: rec.name!,
    brandSlug: rec.brand_slug!,
    modelSlug: rec.model_slug!,
    modelName: rec.model_name!,
    year: rec.year ? Number(rec.year) : null,
    authorName: rec.author_name!,
    authorUrl: rec.author_url!,
    thumbUrl: rec.thumb_url || null,
    viewCount: Number(rec.view_count),
    likeCount: Number(rec.like_count),
    license: rec.license || null,
    publishedAt: rec.published_at || null,
    fetchedAt: new Date(rec.fetched_at!)
  }
}

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db
    .select()
    .from(carModels3d)
    .orderBy(carModels3d.brandSlug, carModels3d.modelSlug, carModels3d.uid)
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
  await upsert(db, records.map(csvRecordToRow))
  log(`imported ${records.length} row(s) from ${path}`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const { db, close } = createDb()
  try {
    if (args.exportCsv) return await exportToCsv(db, args.exportCsv)
    if (args.fromCsv) return await importFromCsv(db, args.fromCsv)

    let catalog = await loadCatalog(db)
    if (!catalog.length) throw new Error('no make/models — run `pnpm ingest:infocar:csv` first')
    if (args.brands.length) catalog = catalog.filter(m => args.brands.includes(m.brandSlug))
    if (args.models.length) catalog = catalog.filter(m => args.models.includes(m.modelSlug))
    if (args.limit) catalog = catalog.slice(0, args.limit)
    log(`searching Sketchfab for ${catalog.length} make/model(s)`)

    const seen = new Set<string>()
    let total = 0
    let n = 0
    for (const m of catalog) {
      n++
      const json = await search(m.brandSlug, m.modelSlug, m.modelName, args.refresh)
      if (!json) continue
      const rows: CarModel3dInsert[] = parseSearch(json, m.brandSlug, m.modelName)
        .filter(hit => !seen.has(hit.uid))
        .map(hit => ({ ...hit, brandSlug: m.brandSlug, modelSlug: m.modelSlug, modelName: m.modelName }))
      for (const r of rows) seen.add(r.uid)
      total += rows.length
      if (rows.length) log(`[${n}/${catalog.length}] ${m.brandSlug}/${m.modelSlug}: ${rows.length} model(s)`)
      if (!args.dryRun && rows.length) await upsert(db, rows)
    }
    log(`done${args.dryRun ? ' (dry-run, nothing written)' : ''}: ${total} model(s)`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  if (err instanceof RateLimitedError) {
    log(`stopped: ${err.message}. Searches done so far are cached and saved — re-run later to resume.`)
    process.exit(2)
  }
  console.error(err)
  process.exit(1)
})
