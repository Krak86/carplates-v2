/**
 * Pre-warm of `registry.wiki_image` — the Wikimedia hero photo of every brand/model/year in the registry, so the result
 * card reads it from our own DB (PLAN.md "Wikimedia hero-image cache in Postgres + pre-warm"). Metadata only: files stay
 * hotlinked from upload.wikimedia.org.
 *
 *   pnpm ingest:wiki-images                       # models with >= 1000 registered passenger cars, most cars first
 *   pnpm ingest:wiki-images -- --min-cars 100     # a wider tier (resumable: models already done are skipped)
 *   pnpm ingest:wiki-images -- --brand kia        # one brand (repeatable)
 *   pnpm ingest:wiki-images -- --limit 50         # first N models, for a trial / a time-boxed session
 *   pnpm ingest:wiki-images -- --dry-run          # fetch + resolve + count, write nothing to the DB
 *   pnpm ingest:wiki-images -- --refresh          # redo models even if stored (ignores the on-disk response cache too)
 *   pnpm ingest:wiki-images -- --rps 2            # requests per second (default 1, max 2)
 *   pnpm ingest:wiki-images -- --retry-failed     # only models whose request failed (failed.json + failed rows past
 *                                                 # next_retry_at); add --all to ignore the wait
 *   pnpm ingest:wiki-images -- --export-csv ./x.csv[.gz]   # dump ok + not_found rows, no fetching
 *   pnpm ingest:wiki-images -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no fetching
 *
 * Per model, in chunks of 20: (1) ONE Commons title search (`"Kia Ceed" filetype:bitmap`, up to 500 hits/page);
 * (2) the best-titled files per registry year (nearest year within 4 when a year has none) go into batched imageinfo
 * requests of 50 titles — thumbnail + licence for all of them at once; (3) only models Commons gave nothing for fall back
 * to the English article's lead image (+ batched attribution). Each model ends with its year-0 row (newest-year photo, or
 * the lead image, or not_found) — written last, so it doubles as the resume marker.
 *
 * Every request that ends in an error (429 / 5xx / timeout / other 4xx, after 3 attempts with backoff + Retry-After) is
 * appended to scripts/.data/wiki-images/failed.json as it happens and the model is stored `failed` (never `not_found`);
 * `--retry-failed` replays exactly those. Search and lead responses are cached to scripts/.data/wiki-images/ so a retry
 * redoes only the failed requests. Ctrl-C finishes the current chunk, then stops cleanly.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, upsertWikiImages, wikiImage } from '@carplates/db'
import type { Db, WikiImageInsert, WikiImageRow } from '@carplates/db'
import {
  IMAGEINFO_BATCH,
  MODEL_LEVEL_YEAR,
  WikimediaError,
  attributionFromMeta,
  commonsFilenameFromUrl,
  commonsImageInfoUrl,
  commonsTitleSearchUrl,
  fetchWikimediaJson,
  titleMentionsModel,
  wikiImageKey,
  wikiImageRowValues,
  wikipediaSearchUrl
} from '@carplates/shared'
import type {
  CommonsImageInfo,
  CommonsPages,
  CommonsTitleSearch,
  WikiImage,
  WikiImageKey,
  WikiImageRowValues,
  WikipediaPage,
  WikipediaSearch
} from '@carplates/shared'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import { inArray, sql } from 'drizzle-orm'

import { FailureLog } from './wiki-images-failures.js'
import type { FailureStage } from './wiki-images-failures.js'
import { planYears, resolveYearImage } from './wiki-images-plan.js'
import type { YearPlan } from './wiki-images-plan.js'

const DATA_DIR = join(import.meta.dirname, '..', '.data', 'wiki-images')
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const CHUNK = 20
const MAX_SEARCH_PAGES = 3
const MIN_YEAR = 1950
const STREAK_429_PAUSE = 6
const PAUSE_MS = 60_000
const DEFAULT_MIN_CARS = 1000

const log = (...m: unknown[]): void => {
  console.log(...m)
}
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

type Args = {
  minCars: number
  brands: string[]
  limit?: number
  dryRun: boolean
  refresh: boolean
  rps: number
  retryFailed: boolean
  all: boolean
  exportCsv?: string
  fromCsv?: string
}

function parseArgs(argv: string[]): Args {
  const a: Args = {
    minCars: DEFAULT_MIN_CARS,
    brands: [],
    dryRun: false,
    refresh: false,
    rps: 1,
    retryFailed: false,
    all: false
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--min-cars') a.minCars = Number(argv[++i])
    else if (arg === '--brand') a.brands.push(wikiImageKey(argv[++i]!, '').brand)
    else if (arg === '--limit') a.limit = Number(argv[++i])
    else if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--refresh') a.refresh = true
    else if (arg === '--rps') a.rps = Math.min(2, Math.max(0.1, Number(argv[++i])))
    else if (arg === '--retry-failed') a.retryFailed = true
    else if (arg === '--all') a.all = true
    else if (arg === '--export-csv') a.exportCsv = argv[++i]
    else if (arg === '--from-csv') a.fromCsv = argv[++i]
  }
  return a
}

// ---- Wikimedia client -----------------------------------------------------------------------------------------

type Result<T> = { ok: true; data: T } | { ok: false; status: number | null; message: string; attempts: number }

/** One request at a time, ≥1/rps apart; backs off further while 429s keep coming and pauses after a streak. */
class Client {
  private lastAt = 0
  private streak429 = 0
  private pauseUntil = 0

  constructor(private readonly rps: number) {}

  private async pace(): Promise<void> {
    const interval = (1000 / this.rps) * Math.min(8, 1 + this.streak429)
    const wait = Math.max(this.lastAt + interval, this.pauseUntil) - Date.now()
    if (wait > 0) await sleep(wait)
    this.lastAt = Date.now()
  }

  async get<T>(url: URL): Promise<Result<T>> {
    try {
      const data = await fetchWikimediaJson<T>(url, {
        userAgent: USER_AGENT,
        beforeRequest: () => this.pace(),
        onRetry: ({ attempt, status, delayMs }) => {
          log(`  retry ${attempt} (${status ?? 'network/timeout'}) in ${(delayMs / 1000).toFixed(1)} s`)
          if (status === 429 && ++this.streak429 >= STREAK_429_PAUSE) {
            log(`  ${this.streak429} rate-limit answers in a row — pausing ${PAUSE_MS / 1000} s`)
            this.pauseUntil = Date.now() + PAUSE_MS
            this.streak429 = 0
          }
        }
      })
      this.streak429 = 0
      return { ok: true, data }
    } catch (err) {
      if (err instanceof WikimediaError)
        return { ok: false, status: err.status, message: err.message, attempts: err.attempts }
      throw err
    }
  }
}

// ---- registry groups ------------------------------------------------------------------------------------------

type ModelGroup = { brand: string; model: string; total: number; years: Map<number, number> }

const groupId = (brand: string, model: string): string => `${brand}\u0000${model}`

/** Passenger-car brand/model/year groups of the current registry, merged under the normalized `wikiImageKey`. */
async function loadGroups(db: Db): Promise<ModelGroup[]> {
  const maxYear = new Date().getFullYear() + 1
  const { rows } = await db.execute<{ brand: string; model: string; year: number; n: number }>(sql`
    SELECT lower(btrim(brand)) AS brand, lower(btrim(model)) AS model, make_year AS year, count(*)::int AS n
    FROM registry.current_registration
    WHERE kind ILIKE '%легков%' AND btrim(coalesce(brand, '')) <> '' AND btrim(coalesce(model, '')) <> ''
      AND make_year BETWEEN ${MIN_YEAR} AND ${maxYear}
    GROUP BY 1, 2, 3
  `)
  const groups = new Map<string, ModelGroup>()
  for (const r of rows) {
    const { brand, model } = wikiImageKey(r.brand, r.model)
    const id = groupId(brand, model)
    const g = groups.get(id) ?? { brand, model, total: 0, years: new Map<number, number>() }
    g.total += r.n
    g.years.set(r.year, (g.years.get(r.year) ?? 0) + r.n)
    groups.set(id, g)
  }
  return [...groups.values()].sort((a, b) => b.total - a.total)
}

// ---- processing -----------------------------------------------------------------------------------------------

type Work = {
  group: ModelGroup
  prevFailures: number
  titles: string[]
  plans: YearPlan[]
  rows: WikiImageRowValues[]
  /** First failed request of this model; the model is then stored `failed` and no year rows are written. */
  failure: { status: number | null; message: string } | null
  needsLead: boolean
}

type Stats = { ok: number; notFound: number; failed: number; rows: number }

const slug = (g: ModelGroup): string =>
  `${`${g.brand}__${g.model}`.replace(/[^a-z0-9]+/g, '-').slice(0, 80)}-${createHash('sha1').update(groupId(g.brand, g.model)).digest('hex').slice(0, 8)}`

function readCache<T>(kind: string, g: ModelGroup, refresh: boolean): T | undefined {
  const path = join(DATA_DIR, kind, `${slug(g)}.json`)
  return !refresh && existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : undefined
}

function writeCache(kind: string, g: ModelGroup, value: unknown): void {
  const path = join(DATA_DIR, kind, `${slug(g)}.json`)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value))
}

class Runner {
  readonly stats: Stats = { ok: 0, notFound: 0, failed: 0, rows: 0 }

  constructor(
    private readonly db: Db,
    private readonly client: Client,
    private readonly failures: FailureLog,
    private readonly args: Args
  ) {}

  private fail(work: Work, stage: FailureStage, res: Extract<Result<unknown>, { ok: false }>, titles?: string[]): void {
    work.failure ??= { status: res.status, message: res.message }
    this.failures.add({
      stage,
      brand: work.group.brand,
      model: work.group.model,
      ...(titles ? { titles } : {}),
      httpStatus: res.status,
      error: res.message,
      attempts: res.attempts
    })
  }

  /** Stage 1: every Commons file title for the model (cached on disk), paged when >500 hits. */
  private async searchTitles(work: Work): Promise<void> {
    const { group } = work
    const cached = readCache<string[]>('search', group, this.args.refresh)
    if (cached) {
      work.titles = cached
      return
    }
    const titles: string[] = []
    let offset = 0
    for (let page = 0; page < MAX_SEARCH_PAGES; page++) {
      const res = await this.client.get<CommonsTitleSearch>(commonsTitleSearchUrl(group.brand, group.model, offset))
      if (!res.ok) return this.fail(work, 'search', res)
      titles.push(...(res.data.query?.search ?? []).map(s => s.title))
      const next = res.data.continue?.sroffset
      if (next === undefined) break
      offset = next
    }
    writeCache('search', group, titles)
    work.titles = titles
  }

  /** Stage 2: thumbnails + licences for every shortlisted title of the chunk, 50 per request. */
  private async fetchImageInfo(works: Work[]): Promise<Map<string, Partial<CommonsImageInfo>>> {
    const owners = new Map<string, Work[]>()
    for (const w of works) {
      if (w.failure) continue
      for (const plan of w.plans) for (const title of plan.titles) owners.set(title, [...(owners.get(title) ?? []), w])
    }
    const info = new Map<string, Partial<CommonsImageInfo>>()
    const titles = [...owners.keys()]
    for (let i = 0; i < titles.length; i += IMAGEINFO_BATCH) {
      const batch = titles.slice(i, i + IMAGEINFO_BATCH)
      const res = await this.client.get<CommonsPages>(commonsImageInfoUrl(batch))
      if (!res.ok) {
        const affected = new Set(batch.flatMap(t => owners.get(t) ?? []))
        for (const w of affected) {
          const own = new Set(w.plans.flatMap(p => p.titles))
          this.fail(
            w,
            'imageinfo',
            res,
            batch.filter(t => own.has(t))
          )
        }
        continue
      }
      for (const page of Object.values(res.data.query?.pages ?? {})) {
        if (page.imageinfo?.[0]) info.set(page.title, page.imageinfo[0])
      }
    }
    return info
  }

  /** Stage 3: the English article's lead image (+ batched licences) for models Commons had no usable photo for. */
  private async fetchLeads(works: Work[]): Promise<void> {
    const found: Array<{ work: Work; image: WikiImage; fileTitle: string }> = []
    for (const work of works) {
      const { group } = work
      let page = readCache<WikipediaPage | null>('lead', group, this.args.refresh)
      if (page === undefined) {
        const res = await this.client.get<WikipediaSearch>(
          wikipediaSearchUrl('en', `${group.brand} ${group.model}`, { leadImage: true })
        )
        if (!res.ok) {
          this.fail(work, 'lead', res)
          continue
        }
        page = Object.values(res.data.query?.pages ?? {})[0] ?? null
        writeCache('lead', group, page)
      }
      if (!page?.original || !titleMentionsModel(page.title, group.model)) continue
      const shown = page.thumbnail ?? page.original
      const file = commonsFilenameFromUrl(page.original.source)
      if (file) {
        found.push({
          work,
          image: { url: shown.source, width: shown.width, height: shown.height, attribution: null },
          fileTitle: `File:${file.replace(/_/g, ' ')}`
        })
      }
    }

    for (let i = 0; i < found.length; i += IMAGEINFO_BATCH) {
      const batch = found.slice(i, i + IMAGEINFO_BATCH)
      const res = await this.client.get<CommonsPages>(
        commonsImageInfoUrl(
          batch.map(f => f.fileTitle),
          false
        )
      )
      if (!res.ok) {
        for (const f of batch) this.fail(f.work, 'attribution', res, [f.fileTitle])
        continue
      }
      const meta = new Map(
        Object.values(res.data.query?.pages ?? {}).map(p => [
          p.title,
          attributionFromMeta(p.imageinfo?.[0]?.extmetadata)
        ])
      )
      for (const f of batch) {
        f.image.attribution = meta.get(f.fileTitle) ?? null
        f.work.rows.push(
          wikiImageRowValues(wikiImageKey(f.work.group.brand, f.work.group.model), {
            kind: 'ok',
            image: f.image,
            origin: 'lead',
            title: f.fileTitle
          })
        )
      }
    }
  }

  async processChunk(chunk: ModelGroup[], prev: Map<string, WikiImageRow>): Promise<void> {
    const works: Work[] = chunk.map(group => {
      const old = prev.get(groupId(group.brand, group.model))
      return {
        group,
        prevFailures: old?.status === 'failed' ? old.attempts : 0,
        titles: [],
        plans: [],
        rows: [],
        failure: null,
        needsLead: false
      }
    })

    for (const w of works) await this.searchTitles(w)
    for (const w of works) {
      if (!w.failure)
        w.plans = planYears(
          w.titles,
          w.group.model,
          [...w.group.years.keys()].sort((a, b) => b - a)
        )
    }
    const info = await this.fetchImageInfo(works)

    for (const w of works) {
      if (w.failure) continue
      const { brand, model } = w.group
      let newest: { image: WikiImage; title: string } | null = null // plans are newest-year first
      for (const plan of w.plans) {
        const hit = resolveYearImage(plan, model, info)
        const key = wikiImageKey(brand, model, plan.year)
        w.rows.push(
          wikiImageRowValues(
            key,
            hit
              ? {
                  kind: 'ok',
                  image: hit.image,
                  origin: plan.nearest ? 'commons_nearest' : 'commons_year',
                  title: hit.title
                }
              : { kind: 'not_found' }
          )
        )
        if (hit && !newest) newest = hit
      }
      if (newest) {
        w.rows.push(
          wikiImageRowValues(wikiImageKey(brand, model), {
            kind: 'ok',
            image: newest.image,
            origin: 'commons_model',
            title: newest.title
          })
        )
      } else {
        w.needsLead = true
      }
    }

    await this.fetchLeads(works.filter(w => w.needsLead && !w.failure))
    await this.finalize(works)
  }

  private async finalize(works: Work[]): Promise<void> {
    const writes: WikiImageInsert[] = []
    for (const w of works) {
      const { brand, model } = w.group
      const modelKey: WikiImageKey = wikiImageKey(brand, model)
      let line: string
      if (w.failure) {
        writes.push(
          wikiImageRowValues(
            modelKey,
            { kind: 'failed', httpStatus: w.failure.status, error: w.failure.message },
            w.prevFailures
          )
        )
        this.stats.failed++
        line = `FAILED (${w.failure.status ?? 'network/timeout'}) — listed in failed.json`
      } else {
        // A model with neither a Commons nor a lead photo still needs its year-0 marker row.
        const rows = w.rows.some(r => r.year === MODEL_LEVEL_YEAR)
          ? w.rows
          : [...w.rows, wikiImageRowValues(modelKey, { kind: 'not_found' })]
        const yearRows = rows.filter(r => r.year !== MODEL_LEVEL_YEAR)
        const modelRow = rows.find(r => r.year === MODEL_LEVEL_YEAR)!
        writes.push(...yearRows, modelRow) // year-0 last: it is the resume marker
        if (modelRow.status === 'ok') this.stats.ok++
        else this.stats.notFound++
        if (!this.args.dryRun) this.failures.clearModel(brand, model)
        const okYears = yearRows.filter(r => r.status === 'ok').length
        line = `${okYears}/${yearRows.length} year(s) with a photo, model row ${modelRow.status}${modelRow.origin ? ` (${modelRow.origin})` : ''}`
      }
      log(`  ${brand} ${model} (${w.group.total} cars): ${line}`)
    }
    this.stats.rows += writes.length
    if (!this.args.dryRun) await upsertWikiImages(this.db, writes, { refresh: this.args.refresh })
  }
}

// ---- CSV ------------------------------------------------------------------------------------------------------

const CSV_COLUMNS = [
  'brand',
  'model',
  'year',
  'status',
  'image_url',
  'image_width',
  'image_height',
  'attr_author',
  'attr_license',
  'attr_license_url',
  'origin',
  'title',
  'next_retry_at',
  'updated_at'
] as const

function rowToCsvRecord(row: WikiImageRow): Record<(typeof CSV_COLUMNS)[number], string> {
  const n = (v: number | null): string => (v == null ? '' : String(v))
  return {
    brand: row.brand,
    model: row.model,
    year: String(row.year),
    status: row.status,
    image_url: row.imageUrl ?? '',
    image_width: n(row.imageWidth),
    image_height: n(row.imageHeight),
    attr_author: row.attrAuthor ?? '',
    attr_license: row.attrLicense ?? '',
    attr_license_url: row.attrLicenseUrl ?? '',
    origin: row.origin ?? '',
    title: row.title ?? '',
    next_retry_at: row.nextRetryAt?.toISOString() ?? '',
    updated_at: row.updatedAt.toISOString()
  }
}

function csvRecordToRow(rec: Record<string, string>): WikiImageInsert {
  const n = (v: string | undefined): number | null => (!v ? null : Number(v))
  return {
    brand: rec.brand!,
    model: rec.model!,
    year: Number(rec.year),
    status: rec.status!,
    imageUrl: rec.image_url || null,
    imageWidth: n(rec.image_width),
    imageHeight: n(rec.image_height),
    attrAuthor: rec.attr_author || null,
    attrLicense: rec.attr_license || null,
    attrLicenseUrl: rec.attr_license_url || null,
    origin: rec.origin || null,
    title: rec.title || null,
    attempts: 0,
    nextRetryAt: rec.next_retry_at ? new Date(rec.next_retry_at) : null,
    updatedAt: new Date(rec.updated_at!)
  }
}

/** `ok` + `not_found` only: `failed` is environment noise (rate limits, timeouts) and stays local. */
async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db
    .select()
    .from(wikiImage)
    .where(inArray(wikiImage.status, ['ok', 'not_found']))
    .orderBy(wikiImage.brand, wikiImage.model, wikiImage.year)
  const csv = stringifyCsv(rows.map(rowToCsvRecord), { header: true, columns: [...CSV_COLUMNS] })
  await mkdir(dirname(path), { recursive: true })
  const output = path.endsWith('.gz') ? gzipSync(csv) : csv
  await writeFile(path, output)
  log(`exported ${rows.length} row(s) to ${path} (${(output.length / 1024).toFixed(0)} KB)`)
}

const GZIP_MAGIC_0 = 0x1f
const GZIP_MAGIC_1 = 0x8b

async function importFromCsv(db: Db, requestedPath: string): Promise<void> {
  const alt = requestedPath.endsWith('.gz') ? requestedPath.slice(0, -'.gz'.length) : `${requestedPath}.gz`
  const path = [requestedPath, alt].find(p => existsSync(p))
  if (!path) {
    // Lets `ingest:ratings:csv` run on a clone made before the first pre-warm was exported and committed.
    log(`no seed CSV at ${requestedPath} yet — skipped (run ingest:wiki-images, then export:wiki-images:csv)`)
    return
  }
  const raw = await readFile(path)
  const isGzip = raw[0] === GZIP_MAGIC_0 && raw[1] === GZIP_MAGIC_1
  const content = isGzip ? gunzipSync(raw).toString('utf8') : raw.toString('utf8')
  const records = parseCsv(content, { columns: true, trim: true }) as Record<string, string>[]
  await upsertWikiImages(db, records.map(csvRecordToRow), { refresh: true })
  log(`imported ${records.length} row(s) from ${path}`)
}

// ---- main -----------------------------------------------------------------------------------------------------

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
    log('stopping after the current chunk …')
  })

  const failures = new FailureLog(join(DATA_DIR, 'failed.json'))
  const { db, close } = createDb()
  try {
    log('loading registry groups …')
    let groups = await loadGroups(db)
    log(`${groups.length} models with passenger cars in the registry`)

    const stored = await db
      .select()
      .from(wikiImage)
      .where(sql`${wikiImage.year} = ${MODEL_LEVEL_YEAR}`)
    const prev = new Map(stored.map(r => [groupId(r.brand, r.model), r]))
    const now = Date.now()
    const retryIds = new Set(failures.models().map(m => groupId(m.brand, m.model)))
    let waitingForRetry = 0

    groups = groups.filter(g => {
      if (args.brands.length && !args.brands.includes(g.brand)) return false
      const row = prev.get(groupId(g.brand, g.model))
      if (args.retryFailed) {
        const due = row?.status === 'failed' && (args.all || !row.nextRetryAt || row.nextRetryAt.getTime() <= now)
        return due || retryIds.has(groupId(g.brand, g.model))
      }
      if (g.total < args.minCars) return false
      if (args.refresh || !row) return true
      if (row.status === 'failed') {
        waitingForRetry++
        return false
      }
      return row.status === 'not_found' && !!row.nextRetryAt && row.nextRetryAt.getTime() <= now
    })
    if (args.limit) groups = groups.slice(0, args.limit)
    log(
      `${groups.length} model(s) to process${args.retryFailed ? ' (retry-failed)' : ` (>= ${args.minCars} cars)`} at ${args.rps} req/s` +
        (args.dryRun ? ' — dry-run, nothing written' : '')
    )

    const runner = new Runner(db, new Client(args.rps), failures, args)
    for (let i = 0; i < groups.length && !stopping; i += CHUNK) {
      log(`[${i + 1}-${Math.min(i + CHUNK, groups.length)}/${groups.length}]`)
      await runner.processChunk(groups.slice(i, i + CHUNK), prev)
    }

    const { ok, notFound, failed, rows } = runner.stats
    log(
      `done${stopping ? ' (stopped early — re-run to resume)' : ''}: ${ok} model(s) with a photo · ${notFound} not_found · ${failed} failed · ${rows} row(s)`
    )
    const summary = failures.summary()
    if (summary) {
      log(`failed requests: ${summary}`)
      log(
        `full list: ${join(DATA_DIR, 'failed.json')} — rerun them with: pnpm ingest:wiki-images -- --retry-failed [--all]`
      )
    }
    if (waitingForRetry) log(`${waitingForRetry} model(s) stored as failed earlier were skipped — use --retry-failed`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
