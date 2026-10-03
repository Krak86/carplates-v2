/**
 * Crawl of infocar.ua's brand -> model -> version catalog into `registry.infocar_versions` — links and facts only,
 * so a registry (brand, model, year) can link to its exact generation page (see PLAN.md "Car reviews").
 *
 *   pnpm ingest:infocar                       # both trees, every brand (~20-25 min at 1 req/s on a cold cache)
 *   pnpm ingest:infocar -- --brand kia        # one brand slug (repeatable: --brand kia --brand skoda)
 *   pnpm ingest:infocar -- --limit 5          # first N brands, for a trial run
 *   pnpm ingest:infocar -- --dry-run          # crawl + parse + count, write nothing to the DB
 *   pnpm ingest:infocar -- --refresh          # re-fetch pages even if cached on disk
 *   pnpm ingest:infocar -- --export-csv ./x.csv[.gz]   # dump the current table, no fetching
 *   pnpm ingest:infocar -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no fetching
 *
 * Brands come from `reviews/marks.html` (the `/test-drive/` page lists only ~15 popular brands plus a numeric-id
 * <select>); each brand is then tried in both trees, and a brand a tree doesn't have (404) is skipped. Per model one
 * model-level row (`version_name` null, the model page URL, plus review count/average in the reviews tree) and one row
 * per version card. Plain URLs only, ≤1 request/s, honest User-Agent, robots.txt read at runtime and obeyed. Raw HTML
 * is cached to scripts/.data/infocar/ (gitignored) so a re-run, or a run resumed after a failure, re-fetches nothing.
 * Pages are windows-1251 — decoded by their <meta charset>, see infocar-parse.ts.
 *
 * Rows are upserted by URL; rows for pages that disappeared from the site are not deleted (a partial `--brand`/
 * `--limit` run must not wipe the rest). `--export-csv`/`--from-csv` round-trip the table through a committed gz CSV
 * (seed-data/infocar-versions.csv.gz) for zero-crawl setup, like the ratings tables.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, infocarVersions } from '@carplates/db'
import type { Db, InfocarVersionInsert, InfocarVersionRow } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { sql } from 'drizzle-orm'
import { stringify as stringifyCsv } from 'csv-stringify/sync'

import {
  INFOCAR_ORIGIN,
  TREE_PATH,
  absoluteUrl,
  decodeInfocarHtml,
  parseBrands,
  parseModelStats,
  parseModels,
  parseVersions
} from './infocar-parse.js'
import type { InfocarTreeId } from './infocar-parse.js'
import { isAllowed, parseRobots } from './infocar-robots.js'
import type { RobotsRules } from './infocar-robots.js'

const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'infocar')
const MIN_INTERVAL_MS = 1000
const TREES: InfocarTreeId[] = ['test_drive', 'reviews']

type Args = {
  brands: string[]
  limit?: number
  dryRun: boolean
  refresh: boolean
  exportCsv?: string
  fromCsv?: string
}

function parseArgs(argv: string[]): Args {
  const a: Args = { brands: [], dryRun: false, refresh: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--brand') a.brands.push(argv[++i]!)
    else if (arg === '--limit') a.limit = Number(argv[++i])
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

let lastRequestAt = 0

/** Polite fetch: at most one request per MIN_INTERVAL_MS. */
async function throttledFetch(url: string): Promise<Response> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()
  return fetch(url, { headers: { 'user-agent': USER_AGENT, 'accept-language': 'uk' } })
}

/** One cached page: the decoded HTML, or `null` for a 404 (cached as an empty file so it isn't re-requested). */
async function getPage(path: string, rules: RobotsRules, refresh: boolean): Promise<string | null> {
  if (!isAllowed(rules, path)) {
    log(`  robots.txt disallows ${path} — skipped`)
    return null
  }
  const cachePath = join(DATA_DIR, `${path.replace(/^\/|\/$/g, '').replace(/\//g, '__') || 'index'}.html`)
  if (!refresh && existsSync(cachePath)) {
    const buf = await readFile(cachePath)
    return buf.length ? decodeInfocarHtml(buf) : null
  }
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await throttledFetch(`${INFOCAR_ORIGIN}${path}`)
      if (res.status === 404) {
        await mkdir(dirname(cachePath), { recursive: true })
        await writeFile(cachePath, '')
        return null
      }
      if (!res.ok) throw new Error(`status ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      await mkdir(dirname(cachePath), { recursive: true })
      await writeFile(cachePath, buf)
      return decodeInfocarHtml(buf)
    } catch (err) {
      if (attempt >= 3) {
        log(`  ${path}: giving up after ${attempt} attempts (${String(err)}) — skipped, re-run to retry`)
        return null
      }
      await sleep(attempt * 3000)
    }
  }
}

async function loadRobots(refresh: boolean): Promise<RobotsRules> {
  const cachePath = join(DATA_DIR, 'robots.txt')
  let txt: string
  if (!refresh && existsSync(cachePath)) {
    txt = await readFile(cachePath, 'utf8')
  } else {
    const res = await throttledFetch(`${INFOCAR_ORIGIN}/robots.txt`)
    if (!res.ok) throw new Error(`robots.txt: status ${res.status}`)
    txt = await res.text()
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(cachePath, txt)
  }
  return parseRobots(txt, USER_AGENT)
}

/** Crawls both trees of one brand into catalog rows (deduped by URL by the caller). */
async function crawlBrand(
  slug: string,
  isRu: boolean,
  rules: RobotsRules,
  refresh: boolean
): Promise<InfocarVersionInsert[]> {
  const rows: InfocarVersionInsert[] = []
  for (const tree of TREES) {
    const base = `/${TREE_PATH[tree]}/${slug}/`
    const brandHtml = await getPage(base, rules, refresh)
    if (!brandHtml) continue
    for (const model of parseModels(brandHtml, tree, slug)) {
      const modelPath = `${base}${model.slug}/`
      const modelHtml = await getPage(modelPath, rules, refresh)
      if (!modelHtml) continue
      const stats = tree === 'reviews' ? parseModelStats(modelHtml) : null
      const common = {
        tree,
        brandSlug: slug,
        modelSlug: model.slug,
        modelName: model.name,
        reviewCount: stats?.reviewCount ?? model.reviewCount,
        avgRating: stats?.avgRating ?? null,
        isRu
      }
      rows.push({ ...common, versionName: null, yearFrom: null, yearTo: null, url: absoluteUrl(modelPath) })
      for (const v of parseVersions(modelHtml)) {
        rows.push({ ...common, versionName: v.name, yearFrom: v.yearFrom, yearTo: v.yearTo, url: v.url })
      }
    }
  }
  return rows
}

async function upsert(db: Db, rows: InfocarVersionInsert[]): Promise<void> {
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(infocarVersions)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: infocarVersions.url,
        set: {
          tree: sql`excluded.tree`,
          brandSlug: sql`excluded.brand_slug`,
          modelSlug: sql`excluded.model_slug`,
          modelName: sql`excluded.model_name`,
          versionName: sql`excluded.version_name`,
          yearFrom: sql`excluded.year_from`,
          yearTo: sql`excluded.year_to`,
          reviewCount: sql`excluded.review_count`,
          avgRating: sql`excluded.avg_rating`,
          isRu: sql`excluded.is_ru`,
          fetchedAt: sql`now()`
        }
      })
  }
}

const CSV_COLUMNS = [
  'tree',
  'brand_slug',
  'model_slug',
  'model_name',
  'version_name',
  'year_from',
  'year_to',
  'url',
  'review_count',
  'avg_rating',
  'is_ru',
  'fetched_at'
] as const

function rowToCsvRecord(row: InfocarVersionRow): Record<(typeof CSV_COLUMNS)[number], string> {
  const n = (v: number | null): string => (v == null ? '' : String(v))
  return {
    tree: row.tree,
    brand_slug: row.brandSlug,
    model_slug: row.modelSlug,
    model_name: row.modelName,
    version_name: row.versionName ?? '',
    year_from: n(row.yearFrom),
    year_to: n(row.yearTo),
    url: row.url,
    review_count: n(row.reviewCount),
    avg_rating: n(row.avgRating),
    is_ru: row.isRu ? 'true' : 'false',
    fetched_at: row.fetchedAt.toISOString()
  }
}

function csvRecordToRow(rec: Record<string, string>): InfocarVersionInsert {
  const n = (v: string | undefined): number | null => (!v ? null : Number(v))
  return {
    tree: rec.tree!,
    brandSlug: rec.brand_slug!,
    modelSlug: rec.model_slug!,
    modelName: rec.model_name!,
    versionName: rec.version_name || null,
    yearFrom: n(rec.year_from),
    yearTo: n(rec.year_to),
    url: rec.url!,
    reviewCount: n(rec.review_count),
    avgRating: n(rec.avg_rating),
    isRu: rec.is_ru === 'true',
    fetchedAt: new Date(rec.fetched_at!)
  }
}

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db
    .select()
    .from(infocarVersions)
    .orderBy(infocarVersions.tree, infocarVersions.brandSlug, infocarVersions.modelSlug, infocarVersions.url)
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

  const rules = await loadRobots(args.refresh)
  log('fetching the brand list …')
  const marks = await getPage('/reviews/marks.html', rules, args.refresh)
  if (!marks) throw new Error('could not load reviews/marks.html')
  let brands = parseBrands(marks)
  log(`found ${brands.length} brand(s)`)
  if (args.brands.length) brands = brands.filter(b => args.brands.includes(b.slug))
  if (args.limit) brands = brands.slice(0, args.limit)

  const { db, close } = createDb()
  try {
    const byUrl = new Map<string, InfocarVersionInsert>()
    let n = 0
    for (const brand of brands) {
      n++
      const rows = await crawlBrand(brand.slug, brand.isRu, rules, args.refresh)
      for (const row of rows) byUrl.set(row.url, row)
      log(`[${n}/${brands.length}] ${brand.slug}: ${rows.length} row(s)`)
      if (!args.dryRun && rows.length) await upsert(db, [...new Map(rows.map(r => [r.url, r])).values()])
    }
    const all = [...byUrl.values()]
    const count = (tree: InfocarTreeId, versions: boolean): number =>
      all.filter(r => r.tree === tree && (r.versionName !== null) === versions).length
    log(
      `done${args.dryRun ? ' (dry-run, nothing written)' : ''}: ${all.length} row(s) — ` +
        `test drives ${count('test_drive', false)} models / ${count('test_drive', true)} versions, ` +
        `reviews ${count('reviews', false)} models / ${count('reviews', true)} versions`
    )
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
