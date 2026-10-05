/**
 * Crawl of the "test drive" tag listings of itc.ua and mezha.ua into `registry.press_reviews` — links and facts only
 * (title, date, meta-description blurb, tags per language edition), see PLAN.md "Tech-press test drives".
 *
 *   pnpm ingest:press                       # both sites (~120 articles + their ru/en editions, ~5 min cold at 1 req/s)
 *   pnpm ingest:press -- --source mezha     # one site (repeatable: --source itc --source mezha)
 *   pnpm ingest:press -- --limit 10         # first N articles per site, for a trial run
 *   pnpm ingest:press -- --dry-run          # fetch + parse + count, write nothing to the DB
 *   pnpm ingest:press -- --refresh          # re-fetch pages even if cached on disk
 *   pnpm ingest:press -- --export-csv ./x.csv[.gz]   # dump the current table, no fetching
 *   pnpm ingest:press -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no fetching
 *
 * Each site's Ukrainian tag listing is paged until a page adds no new article; every article page is read for its
 * hreflang alternates (itc.ua: uk + ru, mezha.ua: uk + en) and those editions are fetched too, so a row carries one
 * `{url, title, blurb}` per language. Neither site has a structured make/model: the brand is found in the titles/tags
 * against the infocar catalog's brand slugs (`registry.infocar_versions` must be loaded first), the model is matched later at
 * lookup time. Plain URLs only, ≤1 request/s, robots.txt obeyed per host; rows are upserted by primary URL and never
 * deleted, so a partial `--source`/`--limit` run wipes nothing.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, infocarVersions, pressReviews } from '@carplates/db'
import type { Db, PressReviewInsert, PressReviewRow } from '@carplates/db'
import { findBrandSlug, PRESS_LANGS } from '@carplates/shared'
import type { PressLang, PressLangEntry } from '@carplates/shared'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

import { getPage, loadRobots, log } from './press-fetch.js'
import { listingUrl, parseArticle, parseListing, PRESS_ORIGIN, PRESS_SOURCES, yearHintOf } from './press-parse.js'
import type { PressSource } from './press-parse.js'
import type { RobotsRules } from './infocar-robots.js'

const MAX_LISTING_PAGES = 40

type Args = {
  sources: PressSource[]
  limit?: number
  dryRun: boolean
  refresh: boolean
  exportCsv?: string
  fromCsv?: string
}

function parseArgs(argv: string[]): Args {
  const a: Args = { sources: [], dryRun: false, refresh: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--source') {
      const source = PRESS_SOURCES.find(s => s === argv[++i])
      if (!source) throw new Error(`--source must be one of ${PRESS_SOURCES.join(', ')}`)
      a.sources.push(source)
    } else if (arg === '--limit') a.limit = Number(argv[++i])
    else if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--refresh') a.refresh = true
    else if (arg === '--export-csv') a.exportCsv = argv[++i]
    else if (arg === '--from-csv') a.fromCsv = argv[++i]
  }
  return a
}

/** Article URLs of a source's listing, page by page until one adds nothing new. */
async function loadArticleUrls(source: PressSource, rules: RobotsRules, refresh: boolean): Promise<string[]> {
  const urls: string[] = []
  for (let page = 1; page <= MAX_LISTING_PAGES; page++) {
    const html = await getPage(listingUrl(source, page), rules, refresh)
    const fresh = (html ? parseListing(html, source) : []).filter(u => !urls.includes(u))
    if (!fresh.length) break
    urls.push(...fresh)
  }
  return urls
}

async function loadBrandSlugs(db: Db): Promise<string[]> {
  const rows = await db.selectDistinct({ slug: infocarVersions.brandSlug }).from(infocarVersions)
  if (!rows.length)
    log('warning: registry.infocar_versions is empty — brand_slug will be null (run ingest:infocar:csv first)')
  return rows.map(r => r.slug)
}

async function upsert(db: Db, rows: PressReviewInsert[]): Promise<void> {
  const BATCH = 200
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(pressReviews)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: pressReviews.url,
        set: {
          source: sql`excluded.source`,
          brandSlug: sql`excluded.brand_slug`,
          keywords: sql`excluded.keywords`,
          yearHint: sql`excluded.year_hint`,
          publishedAt: sql`excluded.published_at`,
          langs: sql`excluded.langs`,
          fetchedAt: sql`now()`
        }
      })
  }
}

const CSV_COLUMNS = [
  'url',
  'source',
  'brand_slug',
  'keywords',
  'year_hint',
  'published_at',
  'langs',
  'fetched_at'
] as const

const langsSchema = z.partialRecord(
  z.enum(PRESS_LANGS),
  z.object({ url: z.string(), title: z.string(), blurb: z.string().nullable() })
)

function rowToCsvRecord(row: PressReviewRow): Record<(typeof CSV_COLUMNS)[number], string> {
  return {
    url: row.url,
    source: row.source,
    brand_slug: row.brandSlug ?? '',
    keywords: row.keywords,
    year_hint: row.yearHint == null ? '' : String(row.yearHint),
    published_at: row.publishedAt ?? '',
    langs: JSON.stringify(row.langs),
    fetched_at: row.fetchedAt.toISOString()
  }
}

function csvRecordToRow(rec: Record<string, string>): PressReviewInsert {
  return {
    url: rec.url!,
    source: rec.source!,
    brandSlug: rec.brand_slug || null,
    keywords: rec.keywords ?? '',
    yearHint: rec.year_hint ? Number(rec.year_hint) : null,
    publishedAt: rec.published_at || null,
    langs: langsSchema.parse(JSON.parse(rec.langs!)),
    fetchedAt: new Date(rec.fetched_at!)
  }
}

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db.select().from(pressReviews).orderBy(pressReviews.source, pressReviews.url)
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

  const { db, close } = createDb()
  try {
    const brandSlugs = await loadBrandSlugs(db)
    const rows: PressReviewInsert[] = []
    const noBrand: string[] = []
    for (const source of args.sources.length ? args.sources : PRESS_SOURCES) {
      const rules = await loadRobots(PRESS_ORIGIN[source], args.refresh)
      log(`${source}: reading the listing …`)
      let urls = await loadArticleUrls(source, rules, args.refresh)
      log(`${source}: ${urls.length} article(s)`)
      if (args.limit) urls = urls.slice(0, args.limit)

      let n = 0
      for (const listed of urls) {
        n++
        const html = await getPage(listed, rules, args.refresh)
        const primary = html ? parseArticle(html) : null
        if (!primary) {
          log(`[${source} ${n}/${urls.length}] ${listed}: not an article — skipped`)
          continue
        }
        const langs: Partial<Record<PressLang, PressLangEntry>> = {}
        const keywords = new Set(primary.keywords.split(', ').filter(Boolean))
        for (const lang of PRESS_LANGS) {
          const href = lang === 'uk' ? primary.url : primary.alternates[lang]
          if (!href) continue
          const article =
            href === primary.url ? primary : parseArticle((await getPage(href, rules, args.refresh)) ?? '')
          if (!article) continue
          langs[lang] = { url: article.url, title: article.title, blurb: article.blurb }
          article.keywords.split(', ').forEach(k => k && keywords.add(k))
        }
        const titles = PRESS_LANGS.flatMap(l => langs[l]?.title ?? [])
        // English/Latin titles first (brand names are Latin everywhere), then the tags, then the rest.
        const brandSlug = findBrandSlug([langs.en?.title ?? '', ...titles, [...keywords].join(' ')], brandSlugs)
        if (!brandSlug) noBrand.push(primary.url)
        rows.push({
          url: primary.url,
          source,
          brandSlug,
          keywords: [...keywords].join(', '),
          yearHint: yearHintOf(titles),
          publishedAt: primary.publishedAt,
          langs
        })
        log(`[${source} ${n}/${urls.length}] ${brandSlug ?? '?'}: ${Object.keys(langs).join('+')} ${primary.title}`)
      }
    }
    if (!args.dryRun) await upsert(db, rows)
    log(
      `done${args.dryRun ? ' (dry-run, nothing written)' : ''}: ${rows.length} article(s), ` +
        `${rows.length - noBrand.length} with a catalog brand`
    )
    if (noBrand.length) log(`no catalog brand found (${noBrand.length}):\n  ${noBrand.join('\n  ')}`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
