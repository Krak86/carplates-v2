/**
 * Crawl of TopGear UK's per-model editorial reviews (topgear.com/car-reviews/<make>/<model>) into
 * `registry.topgear_reviews` — links and facts only (title, score, date, meta-description blurb), see PLAN.md "Step 2c".
 *
 *   pnpm ingest:topgear                        # every model page from the sitemap (~1,600 pages, ~35-55 min cold at 1 req/s)
 *   pnpm ingest:topgear -- --brand kia         # one TopGear make slug (repeatable: --brand kia --brand skoda)
 *   pnpm ingest:topgear -- --limit 10          # first N model pages, for a trial run
 *   pnpm ingest:topgear -- --dry-run           # fetch + parse + count, write nothing to the DB
 *   pnpm ingest:topgear -- --refresh           # re-fetch pages even if cached on disk
 *   pnpm ingest:topgear -- --export-csv ./x.csv[.gz]   # dump the current table, no fetching
 *   pnpm ingest:topgear -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no fetching
 *
 * Model pages come from `sitemap.xml?page=1..N` (Drupal simple_sitemap; variant and section subpages are dropped).
 * Plain URLs only, ≤1 request/s, robots.txt read at runtime and obeyed; raw HTML is cached to scripts/.data/topgear/
 * (gitignored) so a re-run, or a run resumed after a failure, re-fetches nothing. TopGear's `make` is mapped to our
 * (infocar-spelled) brand slug from `registry.infocar_versions`; makes without a match are logged and stored with a
 * null `brand_slug`. Rows are upserted by URL and never deleted, so a partial `--brand`/`--limit` run wipes nothing.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, infocarVersions, topgearReviews } from '@carplates/db'
import type { Db, TopgearReviewInsert, TopgearReviewRow } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import { sql } from 'drizzle-orm'

import { getPage, loadRobots, log } from './topgear-fetch.js'
import { modelPages, parseSitemapUrls, parseTopgearPage, slugYearRange } from './topgear-parse.js'
import type { TopgearModelRef } from './topgear-parse.js'
import type { RobotsRules } from './infocar-robots.js'

const MAX_SITEMAP_PAGES = 40

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

/** Every `/car-reviews/<make>/<model>` page listed in the sitemap pages (stops at the first empty/missing page). */
async function loadModelRefs(rules: RobotsRules, refresh: boolean): Promise<TopgearModelRef[]> {
  const urls: string[] = []
  for (let page = 1; page <= MAX_SITEMAP_PAGES; page++) {
    const xml = await getPage(`/sitemap.xml?page=${page}`, rules, refresh)
    const found = xml ? parseSitemapUrls(xml) : []
    if (!found.length) break
    urls.push(...found)
  }
  return modelPages(urls)
}

const squash = (s: string): string => s.replace(/[^a-z0-9]/g, '')

/** TopGear make slugs whose infocar spelling differs (anything else is matched exactly or ignoring hyphens). */
const MAKE_ALIASES: Record<string, string> = {
  'mercedes-benz': 'mercedes',
  'mg-motor-uk': 'mg',
  vauxhall: 'opel',
  gwm: 'great-wall'
}

/** TopGear make slug -> our brand slug, matched via `MAKE_ALIASES`, exactly, or ignoring hyphens (`land-rover` vs `landrover`). */
async function loadBrandResolver(db: Db): Promise<(makeSlug: string) => string | null> {
  const rows = await db.selectDistinct({ slug: infocarVersions.brandSlug }).from(infocarVersions)
  if (!rows.length)
    log('warning: registry.infocar_versions is empty — brand_slug will be null (run ingest:infocar:csv first)')
  const bySquashed = new Map(rows.map(r => [squash(r.slug), r.slug]))
  return makeSlug => bySquashed.get(squash(MAKE_ALIASES[makeSlug] ?? makeSlug)) ?? null
}

async function upsert(db: Db, rows: TopgearReviewInsert[]): Promise<void> {
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(topgearReviews)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: topgearReviews.url,
        set: {
          makeSlug: sql`excluded.make_slug`,
          modelSlug: sql`excluded.model_slug`,
          brandSlug: sql`excluded.brand_slug`,
          title: sql`excluded.title`,
          rating: sql`excluded.rating`,
          bestRating: sql`excluded.best_rating`,
          publishedAt: sql`excluded.published_at`,
          yearFrom: sql`excluded.year_from`,
          yearTo: sql`excluded.year_to`,
          blurb: sql`excluded.blurb`,
          fetchedAt: sql`now()`
        }
      })
  }
}

const CSV_COLUMNS = [
  'url',
  'make_slug',
  'model_slug',
  'brand_slug',
  'title',
  'rating',
  'best_rating',
  'published_at',
  'year_from',
  'year_to',
  'blurb',
  'fetched_at'
] as const

function rowToCsvRecord(row: TopgearReviewRow): Record<(typeof CSV_COLUMNS)[number], string> {
  const n = (v: number | null): string => (v == null ? '' : String(v))
  return {
    url: row.url,
    make_slug: row.makeSlug,
    model_slug: row.modelSlug,
    brand_slug: row.brandSlug ?? '',
    title: row.title,
    rating: n(row.rating),
    best_rating: n(row.bestRating),
    published_at: row.publishedAt ?? '',
    year_from: n(row.yearFrom),
    year_to: n(row.yearTo),
    blurb: row.blurb ?? '',
    fetched_at: row.fetchedAt.toISOString()
  }
}

function csvRecordToRow(rec: Record<string, string>): TopgearReviewInsert {
  const n = (v: string | undefined): number | null => (!v ? null : Number(v))
  return {
    url: rec.url!,
    makeSlug: rec.make_slug!,
    modelSlug: rec.model_slug!,
    brandSlug: rec.brand_slug || null,
    title: rec.title!,
    rating: n(rec.rating),
    bestRating: n(rec.best_rating),
    publishedAt: rec.published_at || null,
    yearFrom: n(rec.year_from),
    yearTo: n(rec.year_to),
    blurb: rec.blurb || null,
    fetchedAt: new Date(rec.fetched_at!)
  }
}

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db.select().from(topgearReviews).orderBy(topgearReviews.makeSlug, topgearReviews.url)
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
  log('fetching the sitemap …')
  let refs = await loadModelRefs(rules, args.refresh)
  log(`found ${refs.length} model page(s) across ${new Set(refs.map(r => r.makeSlug)).size} make(s)`)
  if (!refs.length) throw new Error('no /car-reviews/<make>/<model> URLs in the sitemap')
  if (args.brands.length) refs = refs.filter(r => args.brands.includes(r.makeSlug))
  if (args.limit) refs = refs.slice(0, args.limit)

  const { db, close } = createDb()
  try {
    const brandOf = await loadBrandResolver(db)
    const unmatched = new Set<string>()
    const rows: TopgearReviewInsert[] = []
    let missing = 0
    let n = 0
    for (const ref of refs) {
      n++
      const html = await getPage(ref.path, rules, args.refresh)
      const review = html ? parseTopgearPage(html) : null
      if (!review) {
        missing++
        log(`[${n}/${refs.length}] ${ref.makeSlug}/${ref.modelSlug}: no review on the page — skipped`)
        continue
      }
      const brandSlug = brandOf(ref.makeSlug)
      if (!brandSlug) unmatched.add(ref.makeSlug)
      const row: TopgearReviewInsert = {
        url: ref.url,
        makeSlug: ref.makeSlug,
        modelSlug: ref.modelSlug,
        brandSlug,
        title: review.title,
        rating: review.rating,
        bestRating: review.bestRating,
        publishedAt: review.publishedAt,
        ...slugYearRange(ref.modelSlug),
        blurb: review.blurb
      }
      rows.push(row)
      log(
        `[${n}/${refs.length}] ${ref.makeSlug}/${ref.modelSlug}: ${review.rating === null ? 'no score' : `${review.rating}/${review.bestRating ?? 10}`}`
      )
      if (!args.dryRun && rows.length % 50 === 0) await upsert(db, rows.slice(-50))
    }
    if (!args.dryRun) await upsert(db, rows.slice(rows.length - (rows.length % 50)))
    const rated = rows.filter(r => r.rating != null).length
    log(
      `done${args.dryRun ? ' (dry-run, nothing written)' : ''}: ${rows.length} review(s), ${rated} with a score, ` +
        `${missing} page(s) without a review`
    )
    if (unmatched.size)
      log(`makes with no catalog brand match (${unmatched.size}): ${[...unmatched].sort().join(', ')}`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
