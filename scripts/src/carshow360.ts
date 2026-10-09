/**
 * CarShow360 (carshow360.net) 360° gallery catalog into `registry.car_models_360`, so a result card can offer a
 * "360° view" modal (see PLAN.md). Facts + links only — the viewer is carshow360.net's own embed iframe.
 *
 *   pnpm ingest:carshow360                        # gallery sitemap(s) -> rows. 1-2 requests in total, no page crawl
 *   pnpm ingest:carshow360 -- --add-url <url>     # also add galleries the sitemap lacks (repeatable; any gallery URL)
 *   pnpm ingest:carshow360 -- --enrich            # slowly fetch each gallery page for its <title> (resumable)
 *   pnpm ingest:carshow360 -- --retry-failed      # enrich ONLY the ids listed in scripts/.data/carshow360/failed.json
 *   pnpm ingest:carshow360 -- --refresh           # re-download the sitemap even if cached
 *   pnpm ingest:carshow360 -- --dry-run           # parse + count, write nothing to the DB
 *   pnpm ingest:carshow360 -- --export-csv ./x.csv[.gz]   # dump the current table, no fetching
 *   pnpm ingest:carshow360 -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no fetching
 *
 * The site's uncached pages are slow (~15 s) and its origin has answered 500/522/524 under light load, so the base
 * ingest never crawls pages: the sitemap already carries brand, model, generation slug and id. `--enrich` is optional;
 * it is gentle (one request every 5 s, doubling up to 60 s on a slow or failing response, aborting after 10 failures in
 * a row) and logs EVERY failed request (id, slug, URL, status, time) to `scripts/.data/carshow360/failed.json` so
 * `--retry-failed` can re-run just those later. Successfully enriched rows keep their title and are skipped next time.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { carModels360, createDb } from '@carplates/db'
import type { CarModel360Insert, CarModel360Row, Db } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import { eq, inArray, isNull, sql } from 'drizzle-orm'

import {
  labelFromSlug,
  parseGalleryUrl,
  parsePageTitle,
  parseSitemap,
  type Carshow360Entry
} from './carshow360-parse.js'

const ORIGIN = 'https://carshow360.net'
const SITEMAP = (n: number): string => `${ORIGIN}/csSitemapGalleries360_${n}.xml`
const MAX_SITEMAPS = 10
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'carshow360')
const FAILED_PATH = join(DATA_DIR, 'failed.json')
const BASE_INTERVAL_MS = 5000
const MAX_INTERVAL_MS = 60_000
const SLOW_RESPONSE_MS = 5000
const REQUEST_TIMEOUT_MS = 90_000
const MAX_CONSECUTIVE_FAILURES = 10

const log = (...m: unknown[]): void => {
  console.log(...m)
}

type Args = {
  addUrls: string[]
  enrich: boolean
  retryFailed: boolean
  refresh: boolean
  dryRun: boolean
  limit?: number
  exportCsv?: string
  fromCsv?: string
}

function parseArgs(argv: string[]): Args {
  const a: Args = { addUrls: [], enrich: false, retryFailed: false, refresh: false, dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--add-url') a.addUrls.push(argv[++i]!)
    else if (arg === '--enrich') a.enrich = true
    else if (arg === '--retry-failed') a.retryFailed = true
    else if (arg === '--refresh') a.refresh = true
    else if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--limit') a.limit = Number(argv[++i])
    else if (arg === '--export-csv') a.exportCsv = argv[++i]
    else if (arg === '--from-csv') a.fromCsv = argv[++i]
  }
  return a
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

// ---- failure log ------------------------------------------------------------------------------------------------

type Failure = {
  /** `sitemap` (a sitemap file) or `page` (a gallery page, `id` set). */
  kind: 'sitemap' | 'page'
  id: number | null
  brandSlug: string | null
  modelSlug: string | null
  slug: string | null
  url: string
  /** HTTP status, or `timeout` / `network`. */
  status: string
  elapsedMs: number
  at: string
}

async function readFailures(): Promise<Failure[]> {
  if (!existsSync(FAILED_PATH)) return []
  return JSON.parse(await readFile(FAILED_PATH, 'utf8')) as Failure[]
}

async function writeFailures(failures: Failure[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(FAILED_PATH, JSON.stringify(failures, null, 2))
}

// ---- polite fetching --------------------------------------------------------------------------------------------

type Fetched = { status: string; body: Buffer | null; elapsedMs: number }

/** One GET with a hard timeout. Never throws: failures come back as a status string. */
async function get(url: string): Promise<Fetched> {
  const t0 = Date.now()
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: '*/*' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
    const body = res.ok ? Buffer.from(await res.arrayBuffer()) : null
    return { status: String(res.status), body, elapsedMs: Date.now() - t0 }
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
    return { status: timedOut ? 'timeout' : 'network', body: null, elapsedMs: Date.now() - t0 }
  }
}

const GZIP_MAGIC_0 = 0x1f
const GZIP_MAGIC_1 = 0x8b
const isGzip = (b: Buffer): boolean => b[0] === GZIP_MAGIC_0 && b[1] === GZIP_MAGIC_1

/** Gallery sitemaps (`_1`, `_2`, … until a 404), cached on disk. Failures other than the terminating 404 are logged. */
async function loadSitemapEntries(refresh: boolean, failures: Failure[]): Promise<Carshow360Entry[]> {
  await mkdir(DATA_DIR, { recursive: true })
  const entries = new Map<number, Carshow360Entry>()
  for (let n = 1; n <= MAX_SITEMAPS; n++) {
    const cachePath = join(DATA_DIR, `sitemap-${n}.xml`)
    let xml: string
    if (!refresh && existsSync(cachePath)) {
      xml = await readFile(cachePath, 'utf8')
    } else {
      const res = await get(SITEMAP(n))
      if (res.status === '404' && n > 1) break
      if (!res.body) {
        log(`sitemap ${n}: ${res.status} after ${res.elapsedMs} ms — logged to failed.json`)
        failures.push({
          kind: 'sitemap',
          id: null,
          brandSlug: null,
          modelSlug: null,
          slug: null,
          url: SITEMAP(n),
          status: res.status,
          elapsedMs: res.elapsedMs,
          at: new Date().toISOString()
        })
        break
      }
      xml = (isGzip(res.body) ? gunzipSync(res.body) : res.body).toString('utf8')
      await writeFile(cachePath, xml)
      await sleep(BASE_INTERVAL_MS)
    }
    const parsed = parseSitemap(xml)
    for (const e of parsed) entries.set(e.id, e)
    log(`sitemap ${n}: ${parsed.length} galleries`)
  }
  return [...entries.values()]
}

// ---- DB ---------------------------------------------------------------------------------------------------------

const toInsert = (e: Carshow360Entry): CarModel360Insert => ({
  id: e.id,
  brandSlug: e.brandSlug,
  modelSlug: e.modelSlug,
  slug: e.slug,
  label: labelFromSlug(e.slug)
})

async function upsert(db: Db, rows: CarModel360Insert[]): Promise<void> {
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(carModels360)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: carModels360.id,
        // `title` is deliberately left alone: a re-run of the sitemap must not wipe an --enrich result.
        set: {
          brandSlug: sql`excluded.brand_slug`,
          modelSlug: sql`excluded.model_slug`,
          slug: sql`excluded.slug`,
          label: sql`excluded.label`,
          fetchedAt: sql`now()`
        }
      })
  }
}

// ---- enrich pass ------------------------------------------------------------------------------------------------

async function enrich(db: Db, args: Args, failures: Failure[]): Promise<void> {
  let todo: CarModel360Row[]
  if (args.retryFailed) {
    const ids = failures.filter(f => f.kind === 'page' && f.id != null).map(f => f.id!)
    if (!ids.length) return log('no failed page ids to retry')
    todo = await db.select().from(carModels360).where(inArray(carModels360.id, ids)).orderBy(carModels360.id)
  } else {
    todo = await db.select().from(carModels360).where(isNull(carModels360.title)).orderBy(carModels360.id)
  }
  if (args.limit) todo = todo.slice(0, args.limit)
  log(`enriching ${todo.length} gallery page(s), ${BASE_INTERVAL_MS / 1000}s apart (slower when the site is)`)

  const failedById = new Map(failures.filter(f => f.kind === 'page').map(f => [f.id, f]))
  const persist = (): Promise<void> =>
    writeFailures([...failures.filter(f => f.kind === 'sitemap'), ...failedById.values()])
  let interval = BASE_INTERVAL_MS
  let consecutive = 0
  let ok = 0
  let n = 0
  try {
    for (const row of todo) {
      n++
      const url = `${ORIGIN}/en/${row.brandSlug}/${row.modelSlug}/${row.slug}-${row.id}`
      const res = await get(url)
      if (res.body) {
        consecutive = 0
        const title = parsePageTitle(res.body.toString('utf8'))
        failedById.delete(row.id)
        ok++
        if (title)
          await db
            .update(carModels360)
            .set({ title, fetchedAt: sql`now()` })
            .where(eq(carModels360.id, row.id))
        if (n % 25 === 0) log(`[${n}/${todo.length}] ok=${ok} failed=${failedById.size} interval=${interval}ms`)
      } else {
        consecutive++
        log(`[${n}/${todo.length}] ${row.brandSlug}/${row.modelSlug} #${row.id}: ${res.status} (${res.elapsedMs} ms)`)
        failedById.set(row.id, {
          kind: 'page',
          id: row.id,
          brandSlug: row.brandSlug,
          modelSlug: row.modelSlug,
          slug: row.slug,
          url,
          status: res.status,
          elapsedMs: res.elapsedMs,
          at: new Date().toISOString()
        })
        await persist()
        if (consecutive >= MAX_CONSECUTIVE_FAILURES) {
          log(
            `stopping: ${consecutive} failures in a row — the site looks unhealthy. Re-run later with --retry-failed.`
          )
          process.exitCode = 2
          break
        }
      }
      // Back off while the site is slow or failing, recover gradually once it is fast again.
      const struggling = !res.body || res.elapsedMs > SLOW_RESPONSE_MS
      interval = struggling ? Math.min(interval * 2, MAX_INTERVAL_MS) : Math.max(BASE_INTERVAL_MS, interval / 2)
      await sleep(interval)
    }
  } finally {
    await persist()
    log(`enrich done: ${ok} ok, ${failedById.size} failed (listed in ${FAILED_PATH})`)
  }
}

// ---- CSV --------------------------------------------------------------------------------------------------------

const CSV_COLUMNS = ['id', 'brand_slug', 'model_slug', 'slug', 'label', 'title', 'fetched_at'] as const

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db
    .select()
    .from(carModels360)
    .orderBy(carModels360.brandSlug, carModels360.modelSlug, carModels360.id)
  const records = rows.map(r => ({
    id: String(r.id),
    brand_slug: r.brandSlug,
    model_slug: r.modelSlug,
    slug: r.slug,
    label: r.label,
    title: r.title ?? '',
    fetched_at: r.fetchedAt.toISOString()
  }))
  const csv = stringifyCsv(records, { header: true, columns: [...CSV_COLUMNS] })
  await mkdir(dirname(path), { recursive: true })
  const output = path.endsWith('.gz') ? gzipSync(csv) : csv
  await writeFile(path, output)
  log(`exported ${rows.length} row(s) to ${path} (${(output.length / 1024).toFixed(0)} KB)`)
}

function resolveCsvPath(path: string): string {
  if (existsSync(path)) return path
  const alt = path.endsWith('.gz') ? path.slice(0, -'.gz'.length) : `${path}.gz`
  if (existsSync(alt)) return alt
  throw new Error(`neither "${path}" nor "${alt}" exists`)
}

async function importFromCsv(db: Db, requestedPath: string): Promise<void> {
  const path = resolveCsvPath(requestedPath)
  const raw = await readFile(path)
  const content = (isGzip(raw) ? gunzipSync(raw) : raw).toString('utf8')
  const records = parseCsv(content, { columns: true, trim: true }) as Record<string, string>[]
  const rows: CarModel360Insert[] = records.map(rec => ({
    id: Number(rec.id),
    brandSlug: rec.brand_slug!,
    modelSlug: rec.model_slug!,
    slug: rec.slug!,
    label: rec.label!,
    title: rec.title || null,
    fetchedAt: new Date(rec.fetched_at!)
  }))
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(carModels360)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: carModels360.id,
        set: {
          brandSlug: sql`excluded.brand_slug`,
          modelSlug: sql`excluded.model_slug`,
          slug: sql`excluded.slug`,
          label: sql`excluded.label`,
          title: sql`excluded.title`,
          fetchedAt: sql`excluded.fetched_at`
        }
      })
  }
  log(`imported ${rows.length} row(s) from ${path}`)
}

// ---- main -------------------------------------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const { db, close } = createDb()
  try {
    if (args.exportCsv) return await exportToCsv(db, args.exportCsv)
    if (args.fromCsv) return await importFromCsv(db, args.fromCsv)

    const failures = await readFailures()

    if (!args.retryFailed) {
      const sitemapFailures: Failure[] = []
      const sitemapEntries = await loadSitemapEntries(args.refresh, sitemapFailures)
      const byId = new Map(sitemapEntries.map(e => [e.id, e]))
      for (const url of args.addUrls) {
        const e = parseGalleryUrl(url)
        if (e) byId.set(e.id, e)
        else log(`--add-url: not a gallery URL, skipped: ${url}`)
      }
      const entries = [...byId.values()]
      // Sitemap failures are replaced by this run's; page failures from earlier --enrich runs are kept.
      failures.splice(0, failures.length, ...failures.filter(f => f.kind === 'page'), ...sitemapFailures)
      await writeFailures(failures)
      log(`${entries.length} galleries, ${new Set(entries.map(e => `${e.brandSlug}/${e.modelSlug}`)).size} make/models`)
      if (!args.dryRun && entries.length) await upsert(db, entries.map(toInsert))
    }

    if ((args.enrich || args.retryFailed) && !args.dryRun) await enrich(db, args, failures)
    if (failures.length) log(`${failures.length} failed request(s) recorded in ${FAILED_PATH}`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
