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
 *
 * A make, then a model, with no posts at all is skipped before its generations are listed. Uses the same public JSON API the site's own web app calls (`api.e-drive.com.ua/v1`; robots.txt allows everything),
 * ≤1 request/s with an honest User-Agent. Makes whose name has no brand slug of ours are skipped. Rows are upserted by
 * post id, so a re-run refreshes titles and picks up new posts.
 */
import { createDb, ownerPosts } from '@carplates/db'
import type { Db, OwnerPostInsert } from '@carplates/db'
import { edriveModelSlug, infocarBrandSlug } from '@carplates/shared'
import { sql } from 'drizzle-orm'
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

type Args = { brands: string[]; models: string[]; limit?: number; maxPages?: number; dryRun: boolean }

function parseArgs(argv: string[]): Args {
  const a: Args = { brands: [], models: [], dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--brand') a.brands.push(argv[++i]!)
    else if (arg === '--model') a.models.push(argv[++i]!)
    else if (arg === '--limit') a.limit = Number(argv[++i])
    else if (arg === '--max-pages') a.maxPages = Number(argv[++i])
    else if (arg === '--dry-run') a.dryRun = true
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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
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
