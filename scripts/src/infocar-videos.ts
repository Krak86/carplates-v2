/**
 * Crawl of infocar.ua's video section into `registry.car_videos` — YouTube id + title/thumbnail/duration/date and the
 * brand (+ model, + title year) it is tagged with, so a registry (brand, model, year) can show video reviews next to
 * the text ones (see PLAN.md "Car reviews" Step 2). Links and facts only; the video is embedded from YouTube on click.
 *
 *   pnpm ingest:infocar:videos                       # every brand (hours cold: one request per listing page + per video)
 *   pnpm ingest:infocar:videos -- --brand kia        # one brand slug (repeatable)
 *   pnpm ingest:infocar:videos -- --limit 3          # first N brands, for a trial run
 *   pnpm ingest:infocar:videos -- --max-pages 2      # first N listing pages per brand (newest videos)
 *   pnpm ingest:infocar:videos -- --dry-run          # crawl + parse + count, write nothing to the DB
 *   pnpm ingest:infocar:videos -- --refresh          # re-fetch pages even if cached on disk
 *   pnpm ingest:infocar:videos -- --export-csv ./x.csv[.gz]   # dump the current table, no fetching
 *   pnpm ingest:infocar:videos -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no fetching
 *
 * Brands come from `reviews/marks.html` (a brand with no `/video/<brand>/` page 404s and is skipped). Each listing page
 * gives the video ids; each video page is fetched once for its YouTube id, model tag and date (videos hosted on
 * infocar itself, with no YouTube embed, are skipped). Same polite fetcher/cache/robots as infocar.ts. Rows are upserted
 * by YouTube id; a video listed under several brands keeps the first brand it was seen under.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { carVideos, createDb } from '@carplates/db'
import type { CarVideoInsert, CarVideoRow, Db } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { sql } from 'drizzle-orm'
import { stringify as stringifyCsv } from 'csv-stringify/sync'

import { getPage, loadRobots, log } from './infocar-fetch.js'
import { parseBrands } from './infocar-parse.js'
import type { RobotsRules } from './infocar-robots.js'
import { parseLastPage, parseTitleYear, parseVideoListing, parseVideoPage } from './infocar-video-parse.js'

type Args = {
  brands: string[]
  limit?: number
  maxPages?: number
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
    else if (arg === '--max-pages') a.maxPages = Number(argv[++i])
    else if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--refresh') a.refresh = true
    else if (arg === '--export-csv') a.exportCsv = argv[++i]
    else if (arg === '--from-csv') a.fromCsv = argv[++i]
  }
  return a
}

/** Crawls one brand's video listing (all pages, or `maxPages`) into rows, skipping YouTube ids already in `seen`. */
async function crawlBrand(slug: string, rules: RobotsRules, args: Args, seen: Set<string>): Promise<CarVideoInsert[]> {
  const first = await getPage(`/video/${slug}/`, rules, args.refresh)
  if (!first) return []
  const lastPage = Math.min(parseLastPage(first), args.maxPages ?? Infinity)
  const rows: CarVideoInsert[] = []
  for (let n = 1; n <= lastPage; n++) {
    const html = n === 1 ? first : await getPage(`/video/${slug}/page-${n}/`, rules, args.refresh)
    if (!html) continue
    for (const item of parseVideoListing(html)) {
      const path = `/video/${item.id}.html`
      const videoHtml = await getPage(path, rules, args.refresh)
      const video = videoHtml ? parseVideoPage(videoHtml) : null
      if (!video || seen.has(video.youtubeId)) continue
      seen.add(video.youtubeId)
      const title = video.title || item.title
      rows.push({
        youtubeId: video.youtubeId,
        infocarVideoId: item.id,
        url: `https://www.infocar.ua${path}`,
        title,
        thumbUrl: item.thumbUrl,
        durationS: item.durationS,
        publishedAt: video.publishedAt,
        brandSlug: slug,
        modelSlug: video.modelSlug,
        generationId: video.generationId,
        year: parseTitleYear(title)
      })
    }
    log(`  ${slug} page ${n}/${lastPage}: ${rows.length} video(s) so far`)
  }
  return rows
}

async function upsert(db: Db, rows: CarVideoInsert[]): Promise<void> {
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(carVideos)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: carVideos.youtubeId,
        set: {
          infocarVideoId: sql`excluded.infocar_video_id`,
          url: sql`excluded.url`,
          title: sql`excluded.title`,
          thumbUrl: sql`excluded.thumb_url`,
          durationS: sql`excluded.duration_s`,
          publishedAt: sql`excluded.published_at`,
          brandSlug: sql`excluded.brand_slug`,
          modelSlug: sql`excluded.model_slug`,
          generationId: sql`excluded.generation_id`,
          year: sql`excluded.year`,
          fetchedAt: sql`now()`
        }
      })
  }
}

const CSV_COLUMNS = [
  'youtube_id',
  'infocar_video_id',
  'url',
  'title',
  'thumb_url',
  'duration_s',
  'published_at',
  'brand_slug',
  'model_slug',
  'generation_id',
  'year',
  'fetched_at'
] as const

function rowToCsvRecord(row: CarVideoRow): Record<(typeof CSV_COLUMNS)[number], string> {
  const n = (v: number | null): string => (v == null ? '' : String(v))
  return {
    youtube_id: row.youtubeId,
    infocar_video_id: String(row.infocarVideoId),
    url: row.url,
    title: row.title,
    thumb_url: row.thumbUrl ?? '',
    duration_s: n(row.durationS),
    published_at: row.publishedAt ?? '',
    brand_slug: row.brandSlug,
    model_slug: row.modelSlug ?? '',
    generation_id: n(row.generationId),
    year: n(row.year),
    fetched_at: row.fetchedAt.toISOString()
  }
}

function csvRecordToRow(rec: Record<string, string>): CarVideoInsert {
  const n = (v: string | undefined): number | null => (!v ? null : Number(v))
  return {
    youtubeId: rec.youtube_id!,
    infocarVideoId: Number(rec.infocar_video_id),
    url: rec.url!,
    title: rec.title!,
    thumbUrl: rec.thumb_url || null,
    durationS: n(rec.duration_s),
    publishedAt: rec.published_at || null,
    brandSlug: rec.brand_slug!,
    modelSlug: rec.model_slug || null,
    generationId: n(rec.generation_id),
    year: n(rec.year),
    fetchedAt: new Date(rec.fetched_at!)
  }
}

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db.select().from(carVideos).orderBy(carVideos.brandSlug, carVideos.infocarVideoId)
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
  const marks = await getPage('/reviews/marks.html', rules, args.refresh)
  if (!marks) throw new Error('could not load reviews/marks.html')
  let brands = parseBrands(marks)
  if (args.brands.length) brands = brands.filter(b => args.brands.includes(b.slug))
  if (args.limit) brands = brands.slice(0, args.limit)
  log(`crawling videos for ${brands.length} brand(s)`)

  const { db, close } = createDb()
  try {
    const seen = new Set<string>()
    let total = 0
    let n = 0
    for (const brand of brands) {
      n++
      const rows = await crawlBrand(brand.slug, rules, args, seen)
      total += rows.length
      log(`[${n}/${brands.length}] ${brand.slug}: ${rows.length} video(s)`)
      if (!args.dryRun && rows.length) await upsert(db, rows)
    }
    log(`done${args.dryRun ? ' (dry-run, nothing written)' : ''}: ${total} video(s)`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
