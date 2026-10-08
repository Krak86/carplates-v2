/**
 * YouTube videos from honda.ua's "press review" articles -> `registry.site_videos`, links and facts only (the video is
 * YouTube's; the article just embeds it). One row per (video, model): the model is found in the article title against
 * the infocar catalog's Honda model slugs (`registry.infocar_versions` must be loaded first), the year is the model year
 * the title names (else null = a model-level fallback). Brand-only articles are skipped — a lookup needs a model.
 *
 *   pnpm ingest:honda-videos                 # ~143 articles from the sitemap, ~3 min cold at 1 req/s
 *   pnpm ingest:honda-videos -- --limit 10   # first N articles, for a trial run
 *   pnpm ingest:honda-videos -- --dry-run    # fetch + parse + print, write nothing
 *   pnpm ingest:honda-videos -- --refresh    # re-fetch pages even if cached on disk
 *   pnpm ingest:honda-videos -- --export-csv ./x.csv[.gz]   # dump the table, no fetching
 *   pnpm ingest:honda-videos -- --from-csv ./x.csv[.gz]     # load a CSV, no fetching
 *
 * Plain URLs only, ≤1 request/s, robots.txt obeyed (press-fetch.ts). Rows are upserted, never deleted.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, infocarVersions, siteVideos } from '@carplates/db'
import type { Db, SiteVideoInsert, SiteVideoRow } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import { eq, sql } from 'drizzle-orm'

import {
  cleanTitle,
  HONDA_BRAND_SLUG,
  HONDA_ORIGIN,
  HONDA_SITEMAP,
  listingPageUrl,
  modelSlugsIn,
  parseListingGroups,
  parseYoutubeIds,
  yearOf
} from './honda-videos-parse.js'
import { getPage, loadRobots, log } from './press-fetch.js'
import { parseArticle } from './press-parse.js'
import { parseSitemapUrls } from './topgear-parse.js'

type Args = { limit?: number; dryRun: boolean; refresh: boolean; exportCsv?: string; fromCsv?: string }

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

async function upsert(db: Db, rows: SiteVideoInsert[]): Promise<void> {
  const BATCH = 200
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(siteVideos)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: [siteVideos.youtubeId, siteVideos.modelSlug],
        set: {
          brandSlug: sql`excluded.brand_slug`,
          year: sql`excluded.year`,
          title: sql`excluded.title`,
          articleUrl: sql`excluded.article_url`,
          publishedAt: sql`excluded.published_at`,
          fetchedAt: sql`now()`
        }
      })
  }
}

const CSV_COLUMNS = [
  'youtube_id',
  'model_slug',
  'brand_slug',
  'year',
  'title',
  'article_url',
  'published_at',
  'fetched_at'
] as const

const rowToCsvRecord = (r: SiteVideoRow): Record<(typeof CSV_COLUMNS)[number], string> => ({
  youtube_id: r.youtubeId,
  model_slug: r.modelSlug,
  brand_slug: r.brandSlug,
  year: r.year == null ? '' : String(r.year),
  title: r.title,
  article_url: r.articleUrl,
  published_at: r.publishedAt ?? '',
  fetched_at: r.fetchedAt.toISOString()
})

const csvRecordToRow = (rec: Record<string, string>): SiteVideoInsert => ({
  youtubeId: rec.youtube_id!,
  modelSlug: rec.model_slug!,
  brandSlug: rec.brand_slug!,
  year: rec.year ? Number(rec.year) : null,
  title: rec.title!,
  articleUrl: rec.article_url!,
  publishedAt: rec.published_at || null,
  fetchedAt: new Date(rec.fetched_at!)
})

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db
    .select()
    .from(siteVideos)
    .orderBy(siteVideos.brandSlug, siteVideos.modelSlug, siteVideos.youtubeId)
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

const MAX_LISTING_PAGES = 40

/** Article URL -> the model slugs of the listing group(s) Honda filed it under (page by page until one adds nothing). */
async function loadListingModels(
  rules: Awaited<ReturnType<typeof loadRobots>>,
  modelSlugs: string[],
  refresh: boolean
): Promise<Map<string, Set<string>>> {
  const byUrl = new Map<string, Set<string>>()
  for (let page = 1; page <= MAX_LISTING_PAGES; page++) {
    const html = await getPage(listingPageUrl(page), rules, refresh)
    const groups = html ? parseListingGroups(html) : []
    const before = byUrl.size
    for (const g of groups) {
      const models = modelSlugsIn([g.heading], modelSlugs)
      for (const url of g.urls) {
        const set = byUrl.get(url) ?? new Set<string>()
        models.forEach(m => set.add(m))
        byUrl.set(url, set)
      }
    }
    if (byUrl.size === before) break
  }
  return byUrl
}

async function crawl(db: Db, args: Args): Promise<void> {
  const modelSlugs = (
    await db
      .selectDistinct({ slug: infocarVersions.modelSlug })
      .from(infocarVersions)
      .where(eq(infocarVersions.brandSlug, HONDA_BRAND_SLUG))
  ).map(r => r.slug)
  if (!modelSlugs.length) throw new Error('registry.infocar_versions has no Honda rows — run ingest:infocar:csv first')

  const rules = await loadRobots(HONDA_ORIGIN, args.refresh)
  const sitemap = await getPage(HONDA_SITEMAP, rules, args.refresh)
  const listed = await loadListingModels(rules, modelSlugs, args.refresh)
  let urls = [...new Set([...(sitemap ? parseSitemapUrls(sitemap) : []), ...listed.keys()])]
  log(`${urls.length} article(s) (sitemap + ${listed.size} in the listing's model groups)`)
  if (args.limit) urls = urls.slice(0, args.limit)

  const rows: SiteVideoInsert[] = []
  let withVideo = 0
  let n = 0
  for (const url of urls) {
    n++
    const html = await getPage(url, rules, args.refresh)
    const article = html ? parseArticle(html) : null
    if (!html || !article) continue
    const ids = parseYoutubeIds(html)
    if (!ids.length) continue
    withVideo++
    const title = cleanTitle(article.title)
    // The title names the model most precisely; Honda's own listing group is the fallback (e.g. "Новая HR-V" is fine either way).
    const named = modelSlugsIn([title, article.keywords], modelSlugs)
    const models = named.length ? named : [...(listed.get(url) ?? [])]
    log(`[${n}/${urls.length}] ${ids.join(',')} ${models.join('+') || '(no model — skipped)'} ${title}`)
    for (const youtubeId of ids)
      for (const modelSlug of models)
        rows.push({
          youtubeId,
          modelSlug,
          brandSlug: HONDA_BRAND_SLUG,
          year: yearOf(title),
          title,
          articleUrl: article.url,
          publishedAt: article.publishedAt
        })
  }
  // The same video can sit in several articles: keep the first row per (video, model).
  const unique = [...new Map(rows.map(r => [`${r.youtubeId}|${r.modelSlug}`, r] as const).reverse()).values()].reverse()
  if (!args.dryRun) await upsert(db, unique)
  log(
    `done${args.dryRun ? ' (dry-run, nothing written)' : ''}: ${withVideo} article(s) with a video, ${unique.length} row(s)`
  )
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const { db, close } = createDb()
  try {
    if (args.exportCsv) await exportToCsv(db, args.exportCsv)
    else if (args.fromCsv) await importFromCsv(db, args.fromCsv)
    else await crawl(db, args)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
