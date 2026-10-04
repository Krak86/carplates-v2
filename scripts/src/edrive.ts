/**
 * Crawl of e-drive.com.ua's owner posts into `registry.owner_posts` — for every make/model/generation of its own catalog,
 * the posts car owners filed under it (title, category, cover, date, link), so a registry (brand, model, year) can link
 * "owner stories" next to the infocar reviews. Links and facts only; the post itself is read on e-drive.com.ua.
 *
 *   pnpm ingest:edrive                              # every make (hours cold: ≥1 request per generation, 1 req/s)
 *   pnpm ingest:edrive -- --brand kia               # one brand slug (repeatable)
 *   pnpm ingest:edrive -- --brand kia --model ceed  # one model slug (substring match, repeatable)
 *   pnpm ingest:edrive -- --limit 3                 # first N makes, for a trial run
 *   pnpm ingest:edrive -- --max-pages 2             # first N result pages (10 posts each) per generation
 *   pnpm ingest:edrive -- --dry-run                 # crawl + parse + count, write nothing to the DB
 *   pnpm ingest:edrive -- --export-csv ./x.csv[.gz] # dump the current table, no fetching
 *   pnpm ingest:edrive -- --from-csv ./x.csv[.gz]   # load a CSV you already have, no fetching
 *
 * A make, then a model, with no posts at all is skipped before its generations are listed. Uses the same public JSON API the site's own web app calls (`api.e-drive.com.ua/v1`; robots.txt allows everything),
 * ≤1 request/s with an honest User-Agent. Makes whose name has no brand slug of ours are skipped. Rows are upserted by
 * post id, so a re-run refreshes titles and picks up new posts. `--export-csv`/`--from-csv` round-trip the table through a
 * committed gz CSV (seed-data/edrive-posts.csv.gz) for zero-crawl setup, like the ratings tables.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, ownerPosts } from '@carplates/db'
import type { Db, OwnerPostInsert, OwnerPostRow } from '@carplates/db'
import { edriveModelSlug, infocarBrandSlug } from '@carplates/shared'
import { parse as parseCsv } from 'csv-parse/sync'
import { sql } from 'drizzle-orm'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import type { z } from 'zod'

import {
  EDRIVE_API,
  displayName,
  envelopeSchema,
  generationRanges,
  generationSchema,
  makeSchema,
  modelSchema,
  postToRow,
  searchSchema
} from './edrive-parse.js'
import type { GenerationRange } from './edrive-parse.js'

const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const MIN_INTERVAL_MS = 1000

type Args = {
  brands: string[]
  models: string[]
  limit?: number
  maxPages?: number
  dryRun: boolean
  exportCsv?: string
  fromCsv?: string
}

function parseArgs(argv: string[]): Args {
  const a: Args = { brands: [], models: [], dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--brand') a.brands.push(argv[++i]!)
    else if (arg === '--model') a.models.push(argv[++i]!)
    else if (arg === '--limit') a.limit = Number(argv[++i])
    else if (arg === '--max-pages') a.maxPages = Number(argv[++i])
    else if (arg === '--dry-run') a.dryRun = true
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

/** One API call, throttled and retried; `data` validated against `schema`. */
async function api<T extends z.ZodType>(
  path: string,
  params: Record<string, string | number>,
  schema: T
): Promise<z.infer<T>> {
  const url = `${EDRIVE_API}/${path}?${new URLSearchParams(Object.entries(params).map(([k, v]): [string, string] => [k, String(v)]))}`
  for (let attempt = 1; ; attempt++) {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
    if (wait > 0) await sleep(wait)
    lastRequestAt = Date.now()
    try {
      const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'application/json' } })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const body = envelopeSchema.parse(await res.json())
      if (!body.success) throw new Error('success=false')
      return schema.parse(body.data)
    } catch (err) {
      if (attempt >= 3) throw new Error(`${url}: giving up after ${attempt} attempts (${String(err)})`, { cause: err })
      await sleep(2000 * attempt)
    }
  }
}

const makesSchema = makeSchema.array()
const modelsSchema = modelSchema.array()
const generationsSchema = generationSchema.array()

/** The search API's fixed page size (it ignores `limit`); a shorter page is the last one. */
const PAGE_SIZE = 10

type Posts = z.infer<typeof searchSchema>['posts']

/** Posts under a make, model or generation (whichever ids are given); paged by the last post's `createdAt` (what the site's own search does). */
async function crawlPosts(filter: Record<string, number>, maxPages: number): Promise<Posts> {
  const posts: Posts = []
  let cursor: string | undefined
  for (let page = 1; page <= maxPages; page++) {
    const params: Record<string, string | number> = { filter: 'posts', ...filter }
    if (cursor) params.lastId = cursor
    const batch = (await api('request/search', params, searchSchema)).posts
    if (!batch.length) break
    posts.push(...batch)
    if (batch.length < PAGE_SIZE) break
    const next = batch[batch.length - 1]!.createdAt
    if (next === cursor) break
    cursor = next
  }
  return posts
}

async function upsert(db: Db, rows: OwnerPostInsert[]): Promise<void> {
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(ownerPosts)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: ownerPosts.postId,
        set: {
          url: sql`excluded.url`,
          title: sql`excluded.title`,
          category: sql`excluded.category`,
          coverUrl: sql`excluded.cover_url`,
          createdAt: sql`excluded.created_at`,
          brandSlug: sql`excluded.brand_slug`,
          modelSlug: sql`excluded.model_slug`,
          modelName: sql`excluded.model_name`,
          generationName: sql`excluded.generation_name`,
          yearFrom: sql`excluded.year_from`,
          yearTo: sql`excluded.year_to`,
          fetchedAt: sql`now()`
        }
      })
  }
}

const CSV_COLUMNS = [
  'post_id',
  'url',
  'title',
  'category',
  'cover_url',
  'created_at',
  'brand_slug',
  'model_slug',
  'model_name',
  'generation_name',
  'year_from',
  'year_to',
  'fetched_at'
] as const

function rowToCsvRecord(row: OwnerPostRow): Record<(typeof CSV_COLUMNS)[number], string> {
  const n = (v: number | null): string => (v == null ? '' : String(v))
  return {
    post_id: String(row.postId),
    url: row.url,
    title: row.title,
    category: row.category ?? '',
    cover_url: row.coverUrl ?? '',
    created_at: row.createdAt ?? '',
    brand_slug: row.brandSlug,
    model_slug: row.modelSlug,
    model_name: row.modelName,
    generation_name: row.generationName ?? '',
    year_from: n(row.yearFrom),
    year_to: n(row.yearTo),
    fetched_at: row.fetchedAt.toISOString()
  }
}

function csvRecordToRow(rec: Record<string, string>): OwnerPostInsert {
  const n = (v: string | undefined): number | null => (!v ? null : Number(v))
  return {
    postId: Number(rec.post_id),
    url: rec.url!,
    title: rec.title!,
    category: rec.category || null,
    coverUrl: rec.cover_url || null,
    createdAt: rec.created_at || null,
    brandSlug: rec.brand_slug!,
    modelSlug: rec.model_slug!,
    modelName: rec.model_name!,
    generationName: rec.generation_name || null,
    yearFrom: n(rec.year_from),
    yearTo: n(rec.year_to),
    fetchedAt: new Date(rec.fetched_at!)
  }
}

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db.select().from(ownerPosts).orderBy(ownerPosts.brandSlug, ownerPosts.postId)
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

  const makes = (await api('cars/makes', {}, makesSchema)).flatMap(make => {
    const slug = infocarBrandSlug(make.name)
    return slug && (!args.brands.length || args.brands.includes(slug)) ? [{ ...make, slug }] : []
  })
  const selected = args.limit ? makes.slice(0, args.limit) : makes
  log(`crawling owner posts for ${selected.length} make(s)`)

  const { db, close } = createDb()
  try {
    let total = 0
    let n = 0
    for (const make of selected) {
      n++
      // A make or model with no posts at all skips its whole generation tree — most of the catalog.
      if (!(await crawlPosts({ makeId: make.id }, 1)).length) {
        log(`[${n}/${selected.length}] ${make.slug}: no posts`)
        continue
      }
      const models = (await api('cars/models', { makeId: make.id }, modelsSchema)).filter(
        m => !args.models.length || args.models.some(wanted => edriveModelSlug(displayName(m)).includes(wanted))
      )
      let makeTotal = 0
      for (const model of models) {
        const modelName = displayName(model)
        if (!(await crawlPosts({ makeId: make.id, modelId: model.id }, 1)).length) continue
        const ranges: GenerationRange[] = generationRanges(
          await api('cars/generations', { modelId: model.id }, generationsSchema)
        )
        const rows: OwnerPostInsert[] = []
        for (const range of ranges) {
          const posts = await crawlPosts(
            { makeId: make.id, modelId: model.id, generationId: range.generation.id },
            args.maxPages ?? Infinity
          )
          rows.push(...posts.map(post => postToRow(post, make.slug, modelName, range)))
        }
        makeTotal += rows.length
        if (rows.length) log(`  ${make.slug} ${modelName}: ${rows.length} post(s) in ${ranges.length} generation(s)`)
        if (!args.dryRun && rows.length) await upsert(db, rows)
      }
      total += makeTotal
      log(`[${n}/${selected.length}] ${make.slug}: ${makeTotal} post(s)`)
    }
    log(`done${args.dryRun ? ' (dry-run, nothing written)' : ''}: ${total} post(s)`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
