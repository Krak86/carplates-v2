/**
 * YouTube fallback for models infocar.ua has no video for (PLAN.md "Step 2a"): a quota-limited offline batch that
 * searches the YouTube Data API per registry (brand, model), filters by title and stores links + facts in
 * `registry.youtube_videos`. Staged like the wiki-images pre-warm: gap models only (`videoLookup` over the infocar
 * videos returns nothing), the most-registered first, resumable, tier by tier.
 *
 *   pnpm ingest:youtube-videos                        # gap models with >= 1000 registered passenger cars, most cars first
 *   pnpm ingest:youtube-videos -- --min-cars 100      # a wider tier (resumable: models already done are skipped)
 *   pnpm ingest:youtube-videos -- --list              # print the gap list + the quota/day estimate, no API calls
 *   pnpm ingest:youtube-videos -- --brand volkswagen  # one brand (infocar slug, repeatable); --model touran too
 *   pnpm ingest:youtube-videos -- --limit 10          # first N models, for a trial
 *   pnpm ingest:youtube-videos -- --dry-run           # search + filter + print, write nothing
 *   pnpm ingest:youtube-videos -- --refresh           # redo models even if done (also retries `none` models now)
 *   pnpm ingest:youtube-videos -- --daily-units 9000  # stop after this many units in the current Pacific day (default 9000)
 *   pnpm ingest:youtube-videos -- --export-csv ./x.csv[.gz]   # dump the videos, no API calls
 *   pnpm ingest:youtube-videos -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no API calls
 *
 * Per model: a ua query, then ru, then en — it stops at the first one after which >= 3 videos survive the title filter
 * (alias in the title, embeddable, >= 150 s, no dealer words). `search.list` costs 100 units, `videos.list` 1 per 50 ids,
 * so a model is ~101 units and a 10,000-unit day covers ~90 of them. The ledger of today's units lives in
 * `registry.youtube_model_runs` (the quota resets at midnight Pacific), which is also the resume marker: re-run daily.
 * Needs `GOOGLE_API_KEY` (the package.json entry loads apps/api/.env). Ctrl-C finishes the current model, then stops.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { carVideos, createDb, infocarVersions, youtubeModelRuns, youtubeVideos } from '@carplates/db'
import type { Db, YoutubeVideoInsert } from '@carplates/db'
import { INFOCAR_TREES, infocarBrandSlug, slugify, videoLookup } from '@carplates/shared'
import type { InfocarRow } from '@carplates/shared'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import { and, gte, sql } from 'drizzle-orm'
import { z } from 'zod'

import {
  aliasesFor,
  baseModel,
  collapseModel,
  pacificDayStart,
  parseIsoDuration,
  pickTop,
  rejection,
  searchQueries,
  titleLang,
  titleYear
} from './youtube-videos-filter.js'
import type { Rejection, VideoLang } from './youtube-videos-filter.js'

const SEARCH_COST = 100
const ENOUGH = 3
const DEFAULT_MIN_CARS = 1000
const DEFAULT_DAILY_UNITS = 9000
const NONE_RETRY_MS = 30 * 24 * 3600 * 1000
const MIN_YEAR = 1950
const MAX_ERRORS_IN_A_ROW = 5

const log = (...m: unknown[]): void => {
  console.log(...m)
}

type Args = {
  minCars: number
  brands: string[]
  models: string[]
  limit?: number
  list: boolean
  dryRun: boolean
  refresh: boolean
  dailyUnits: number
  exportCsv?: string
  fromCsv?: string
}

function parseArgs(argv: string[]): Args {
  const a: Args = {
    minCars: DEFAULT_MIN_CARS,
    brands: [],
    models: [],
    list: false,
    dryRun: false,
    refresh: false,
    dailyUnits: DEFAULT_DAILY_UNITS
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--min-cars') a.minCars = Number(argv[++i])
    else if (arg === '--brand') a.brands.push(slugify(argv[++i] ?? ''))
    else if (arg === '--model') a.models.push(slugify(argv[++i] ?? ''))
    else if (arg === '--limit') a.limit = Number(argv[++i])
    else if (arg === '--list') a.list = true
    else if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--refresh') a.refresh = true
    else if (arg === '--daily-units') a.dailyUnits = Number(argv[++i])
    else if (arg === '--export-csv') a.exportCsv = argv[++i]
    else if (arg === '--from-csv') a.fromCsv = argv[++i]
  }
  return a
}

// ---- target list -----------------------------------------------------------------------------------------------

type Target = { brandSlug: string; modelSlug: string; brand: string; model: string; cars: number }

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>()
  for (const item of items) out.set(key(item), [...(out.get(key(item)) ?? []), item])
  return out
}

const targetId = (brandSlug: string, modelSlug: string): string => `${brandSlug}/${modelSlug}`

/** The brand as a query word: the part before the registry's double space ("Fiat  Doblo"), Latin title-cased, Cyrillic upper-cased. */
const queryBrand = (raw: string): string => {
  const brand = (raw.trim().split(/\s{2,}/)[0] ?? '').trim()
  return /[a-z]/i.test(brand)
    ? brand.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`)
    : brand.toUpperCase()
}

/**
 * Passenger-car (brand, model) pairs of the current registry, doubled spellings collapsed, most cars first, keeping
 * only those the infocar videos have nothing for (`videoLookup` without a year).
 */
async function loadGapTargets(db: Db): Promise<Target[]> {
  const maxYear = new Date().getFullYear() + 1
  const { rows } = await db.execute<{ brand: string; model: string; n: number }>(sql`
    SELECT btrim(brand) AS brand, btrim(model) AS model, count(*)::int AS n
    FROM registry.current_registration
    WHERE kind ILIKE '%легков%' AND btrim(coalesce(brand, '')) <> '' AND btrim(coalesce(model, '')) <> ''
      AND make_year BETWEEN ${MIN_YEAR} AND ${maxYear}
    GROUP BY 1, 2
  `)
  const merged = new Map<string, Target & { top: number }>()
  for (const r of rows) {
    const brandSlug = infocarBrandSlug(r.brand)
    if (!brandSlug) continue
    const model = baseModel(brandSlug, collapseModel(r.model))
    const modelSlug = slugify(model)
    if (!modelSlug) continue
    const id = targetId(brandSlug, modelSlug)
    const t = merged.get(id) ?? { brandSlug, modelSlug, brand: queryBrand(r.brand), model, cars: 0, top: 0 }
    t.cars += r.n
    if (r.n > t.top) Object.assign(t, { top: r.n, model, brand: queryBrand(r.brand) }) // spelling of the biggest variant
    merged.set(id, t)
  }

  const [videoRows, versionRows] = await Promise.all([db.select().from(carVideos), db.select().from(infocarVersions)])
  const catalog = versionRows.flatMap((r): InfocarRow[] =>
    INFOCAR_TREES.find(tree => tree === r.tree) ? [{ ...r, tree: r.tree as InfocarRow['tree'] }] : []
  )
  const videosByBrand = groupBy(videoRows, v => v.brandSlug)
  const catalogByBrand = groupBy(catalog, v => v.brandSlug)

  return [...merged.values()]
    .filter(
      t =>
        !videoLookup(
          videosByBrand.get(t.brandSlug) ?? [],
          catalogByBrand.get(t.brandSlug) ?? [],
          t.brand,
          t.model,
          null
        ).length
    )
    .sort((a, b) => b.cars - a.cars)
}

// ---- YouTube client --------------------------------------------------------------------------------------------

const SearchSchema = z.object({
  items: z.array(z.object({ id: z.object({ videoId: z.string() }) })).default([])
})
const VideosSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      snippet: z.object({ title: z.string(), channelTitle: z.string(), publishedAt: z.string() }),
      contentDetails: z.object({ duration: z.string() }),
      status: z.object({ embeddable: z.boolean() }),
      statistics: z.object({ viewCount: z.string().optional() })
    })
  )
})
const ErrorSchema = z.object({
  error: z.object({ errors: z.array(z.object({ reason: z.string() })).default([]) }).partial()
})

class QuotaExceeded extends Error {}

/** Counts units as they are spent; the key goes in the request only and never into an error message. */
class YouTube {
  units = 0

  constructor(private readonly apiKey: string) {}

  private async call(path: string, params: Record<string, string>, cost: number): Promise<unknown> {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`)
    url.search = new URLSearchParams({ ...params, key: this.apiKey }).toString()
    const res = await fetch(url)
    const body: unknown = await res.json()
    if (!res.ok) {
      const reasons = ErrorSchema.safeParse(body).data?.error.errors?.map(e => e.reason) ?? []
      if (res.status === 403 && reasons.includes('quotaExceeded')) throw new QuotaExceeded('quotaExceeded')
      throw new Error(`${path} ${res.status} ${reasons.join(',')}`)
    }
    this.units += cost
    return body
  }

  async search(q: string): Promise<string[]> {
    const raw = SearchSchema.parse(
      await this.call(
        'search',
        { part: 'id', q, type: 'video', maxResults: '50', videoEmbeddable: 'true' },
        SEARCH_COST
      )
    )
    return raw.items.map(i => i.id.videoId)
  }

  async details(ids: string[]): Promise<z.infer<typeof VideosSchema>['items']> {
    const out: z.infer<typeof VideosSchema>['items'] = []
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50)
      const res = VideosSchema.parse(
        await this.call('videos', { part: 'snippet,contentDetails,status,statistics', id: chunk.join(',') }, 1)
      )
      out.push(...res.items)
    }
    return out
  }
}

// ---- per-model search ------------------------------------------------------------------------------------------

type Kept = {
  youtubeId: string
  title: string
  channel: string
  views: number
  durationS: number
  publishedAt: string
  lang: VideoLang
  year: number | null
  query: string
}

type Outcome = { kept: Kept[]; found: number; queries: number; units: number; dropped: Record<Rejection, number> }

/** The cascade: ua, ru, en queries until >= ENOUGH videos survive the filter. */
async function searchModel(yt: YouTube, t: Target): Promise<Outcome> {
  const aliases = aliasesFor(t.brandSlug, t.modelSlug, t.brand, t.model)
  const seen = new Set<string>()
  const kept: Kept[] = []
  const dropped: Record<Rejection, number> = { 'not embeddable': 0, 'no model in title': 0, dealer: 0, short: 0 }
  const startUnits = yt.units
  let queries = 0
  for (const query of searchQueries(t.brand, t.model)) {
    queries++
    const fresh = (await yt.search(query)).filter(id => !seen.has(id))
    for (const id of fresh) seen.add(id)
    if (fresh.length) {
      for (const v of await yt.details(fresh)) {
        const title = v.snippet.title
        const durationS = parseIsoDuration(v.contentDetails.duration)
        const why = rejection({ title, durationS, embeddable: v.status.embeddable }, aliases)
        if (why) dropped[why]++
        else {
          kept.push({
            youtubeId: v.id,
            title,
            channel: v.snippet.channelTitle,
            views: Number(v.statistics.viewCount ?? 0),
            durationS,
            publishedAt: v.snippet.publishedAt.slice(0, 10),
            lang: titleLang(title),
            year: titleYear(title),
            query
          })
        }
      }
    }
    if (kept.length >= ENOUGH) break
  }
  return { kept: pickTop(kept), found: seen.size, queries, units: yt.units - startUnits, dropped }
}

// ---- persistence -----------------------------------------------------------------------------------------------

const toRow = (t: Target, k: Kept): YoutubeVideoInsert => ({
  youtubeId: k.youtubeId,
  brandSlug: t.brandSlug,
  modelSlug: t.modelSlug,
  lang: k.lang,
  title: k.title,
  channel: k.channel,
  views: k.views,
  durationS: k.durationS,
  publishedAt: k.publishedAt,
  year: k.year,
  query: k.query
})

async function upsertVideos(db: Db, rows: YoutubeVideoInsert[]): Promise<void> {
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(youtubeVideos)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: youtubeVideos.youtubeId,
        set: {
          brandSlug: sql`excluded.brand_slug`,
          modelSlug: sql`excluded.model_slug`,
          lang: sql`excluded.lang`,
          title: sql`excluded.title`,
          channel: sql`excluded.channel`,
          views: sql`excluded.views`,
          durationS: sql`excluded.duration_s`,
          publishedAt: sql`excluded.published_at`,
          year: sql`excluded.year`,
          query: sql`excluded.query`,
          fetchedAt: sql`now()`
        }
      })
  }
}

async function saveModel(db: Db, t: Target, o: Outcome): Promise<void> {
  await upsertVideos(
    db,
    o.kept.map(k => toRow(t, k))
  )
  const run = {
    brandSlug: t.brandSlug,
    modelSlug: t.modelSlug,
    status: o.kept.length ? 'ok' : 'none',
    kept: o.kept.length,
    queries: o.queries,
    units: o.units,
    cars: t.cars
  }
  await db
    .insert(youtubeModelRuns)
    .values(run)
    .onConflictDoUpdate({
      target: [youtubeModelRuns.brandSlug, youtubeModelRuns.modelSlug],
      set: { ...run, runAt: sql`now()` }
    })
}

// ---- CSV -------------------------------------------------------------------------------------------------------

const CSV_COLUMNS = [
  'youtube_id',
  'brand_slug',
  'model_slug',
  'lang',
  'title',
  'channel',
  'views',
  'duration_s',
  'published_at',
  'year',
  'query'
] as const

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db
    .select()
    .from(youtubeVideos)
    .orderBy(youtubeVideos.brandSlug, youtubeVideos.modelSlug, youtubeVideos.youtubeId)
  const records = rows.map(r => ({
    youtube_id: r.youtubeId,
    brand_slug: r.brandSlug,
    model_slug: r.modelSlug,
    lang: r.lang,
    title: r.title,
    channel: r.channel,
    views: String(r.views),
    duration_s: String(r.durationS),
    published_at: r.publishedAt ?? '',
    year: r.year == null ? '' : String(r.year),
    query: r.query
  }))
  const csv = stringifyCsv(records, { header: true, columns: [...CSV_COLUMNS] })
  await mkdir(dirname(path), { recursive: true })
  const output = path.endsWith('.gz') ? gzipSync(csv) : csv
  await writeFile(path, output)
  log(`exported ${rows.length} video(s) to ${path} (${(output.length / 1024).toFixed(0)} KB)`)
}

const GZIP_MAGIC_0 = 0x1f
const GZIP_MAGIC_1 = 0x8b

const CsvRecordSchema = z.object({
  youtube_id: z.string().min(1),
  brand_slug: z.string().min(1),
  model_slug: z.string().min(1),
  lang: z.enum(['ua', 'ru', 'en']),
  title: z.string(),
  channel: z.string(),
  views: z.coerce.number().int().min(0),
  duration_s: z.coerce.number().int().min(0),
  published_at: z.string(),
  year: z.string(),
  query: z.string()
})

async function importFromCsv(db: Db, requestedPath: string): Promise<void> {
  const alt = requestedPath.endsWith('.gz') ? requestedPath.slice(0, -'.gz'.length) : `${requestedPath}.gz`
  const path = [requestedPath, alt].find(p => existsSync(p))
  if (!path) {
    // Lets `ingest:ratings:csv` run on a clone made before the first crawl was exported and committed.
    log(`no seed CSV at ${requestedPath} yet — skipped (run ingest:youtube-videos, then export:youtube-videos:csv)`)
    return
  }
  const raw = await readFile(path)
  const isGzip = raw[0] === GZIP_MAGIC_0 && raw[1] === GZIP_MAGIC_1
  const content = isGzip ? gunzipSync(raw).toString('utf8') : raw.toString('utf8')
  const records = z.array(CsvRecordSchema).parse(parseCsv(content, { columns: true, trim: true }))
  const rows: YoutubeVideoInsert[] = records.map(r => ({
    youtubeId: r.youtube_id,
    brandSlug: r.brand_slug,
    modelSlug: r.model_slug,
    lang: r.lang,
    title: r.title,
    channel: r.channel,
    views: r.views,
    durationS: r.duration_s,
    publishedAt: r.published_at || null,
    year: r.year ? Number(r.year) : null,
    query: r.query
  }))
  await upsertVideos(db, rows)
  // The imported models count as done, so a fresh clone doesn't spend quota re-searching them.
  const perModel = groupBy(rows, r => targetId(r.brandSlug, r.modelSlug))
  const runs = [...perModel.values()].map(list => ({
    brandSlug: list[0]!.brandSlug,
    modelSlug: list[0]!.modelSlug,
    status: 'ok',
    kept: list.length
  }))
  if (runs.length) await db.insert(youtubeModelRuns).values(runs).onConflictDoNothing()
  log(`imported ${rows.length} video(s) for ${runs.length} model(s) from ${path}`)
}

// ---- main ------------------------------------------------------------------------------------------------------

function printList(targets: Target[], dailyUnits: number): void {
  const tiers = [10000, 5000, 2000, 1000, 100, 10]
  log('\ngap models by tier (cars ≥ N): models · registered cars · ≈ days at the cascade cost (~101 units/model)')
  const perDay = Math.floor(dailyUnits / 101)
  for (const tier of tiers) {
    const inTier = targets.filter(t => t.cars >= tier)
    const cars = inTier.reduce((s, t) => s + t.cars, 0)
    log(
      `  ≥ ${String(tier).padStart(4)}: ${String(inTier.length).padStart(4)} models · ${cars} cars · ≈ ${(inTier.length / perDay).toFixed(1)} day(s)`
    )
  }
  log('\ntop gap models:')
  for (const t of targets.slice(0, 40))
    log(`  ${String(t.cars).padStart(7)}  ${t.brand} ${t.model}  (${t.brandSlug}/${t.modelSlug})`)
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

  let stopping = false
  process.on('SIGINT', () => {
    stopping = true
    log('stopping after the current model …')
  })

  const { db, close } = createDb()
  try {
    log('loading registry + infocar videos, finding models without a video …')
    const gaps = await loadGapTargets(db)
    log(`${gaps.length} gap model(s) (no infocar video) among passenger cars`)
    if (args.list) {
      printList(gaps, args.dailyUnits)
      return
    }

    const runs = await db.select().from(youtubeModelRuns)
    const runById = new Map(runs.map(r => [targetId(r.brandSlug, r.modelSlug), r]))
    const now = Date.now()
    const todo = gaps
      .filter(t => t.cars >= args.minCars)
      .filter(t => !args.brands.length || args.brands.includes(t.brandSlug))
      .filter(t => !args.models.length || args.models.includes(t.modelSlug))
      .filter(t => {
        const run = runById.get(targetId(t.brandSlug, t.modelSlug))
        if (args.refresh || !run) return true
        return run.status === 'none' && now - run.runAt.getTime() >= NONE_RETRY_MS
      })
    const batch = args.limit ? todo.slice(0, args.limit) : todo

    const [{ spent } = { spent: 0 }] = await db
      .select({ spent: sql<number>`coalesce(sum(${youtubeModelRuns.units}), 0)::int` })
      .from(youtubeModelRuns)
      .where(and(gte(youtubeModelRuns.runAt, pacificDayStart())))
    log(
      `${batch.length} model(s) to search (≥ ${args.minCars} cars), ${spent}/${args.dailyUnits} units already spent this Pacific day` +
        (args.dryRun ? ' — dry-run, nothing written' : '')
    )

    const apiKey = z.string().min(1).safeParse(process.env.GOOGLE_API_KEY).data
    if (!apiKey) {
      log('GOOGLE_API_KEY is not set (apps/api/.env) — nothing to do')
      process.exitCode = 1
      return
    }
    const yt = new YouTube(apiKey)
    const stats = { withVideos: 0, none: 0, videos: 0, errors: 0 }
    let errorsInARow = 0
    let stopReason = ''

    for (const [i, t] of batch.entries()) {
      if (stopping) break
      if (!args.dryRun && spent + yt.units + SEARCH_COST > args.dailyUnits) {
        stopReason = 'daily unit budget reached'
        break
      }
      try {
        const o = await searchModel(yt, t)
        errorsInARow = 0
        if (o.kept.length) stats.withVideos++
        else stats.none++
        stats.videos += o.kept.length
        const langs = (['ua', 'ru', 'en'] as const)
          .map(l => `${l}:${o.kept.filter(k => k.lang === l).length}`)
          .join(' ')
        log(
          `[${i + 1}/${batch.length}] ${t.brand} ${t.model} (${t.cars} cars): ${o.kept.length} kept of ${o.found} found (${langs}), ` +
            `${o.queries} quer${o.queries === 1 ? 'y' : 'ies'}, ${o.units} units`
        )
        for (const k of o.kept.slice(0, args.dryRun ? 6 : 0))
          log(`    [${k.lang}] ${k.views}v ${Math.round(k.durationS / 60)}m ${k.youtubeId} | ${k.channel} | ${k.title}`)
        if (!args.dryRun) await saveModel(db, t, o)
      } catch (err) {
        if (err instanceof QuotaExceeded) {
          stopReason = 'YouTube answered quotaExceeded'
          break
        }
        stats.errors++
        log(
          `[${i + 1}/${batch.length}] ${t.brand} ${t.model}: ERROR ${err instanceof Error ? err.message : String(err)}`
        )
        if (++errorsInARow >= MAX_ERRORS_IN_A_ROW) {
          stopReason = `${MAX_ERRORS_IN_A_ROW} errors in a row`
          break
        }
      }
    }

    log(
      `done${stopping ? ' (stopped early)' : ''}${stopReason ? ` — ${stopReason}` : ''}: ${stats.withVideos} model(s) with videos · ` +
        `${stats.none} none · ${stats.errors} error(s) · ${stats.videos} video(s) · ${yt.units} units this run`
    )
    const left = todo.length - stats.withVideos - stats.none
    if (left > 0 && !args.dryRun)
      log(`${left} model(s) left in this tier — re-run (tomorrow's quota if the budget ran out)`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
