/**
 * Auto-news ingest: polls the RSS feeds listed in `scripts/news-sources.json` into `registry.news_items`, tagging each
 * headline with the infocar catalog's brand / model / year (see `tagNews` in @carplates/shared). Links + facts only.
 *
 *   pnpm ingest:news                          # every enabled source
 *   pnpm ingest:news -- --source autoua       # one source (repeatable)
 *   pnpm ingest:news -- --dry-run             # fetch + parse + tag + report, write nothing
 *   pnpm ingest:news -- --list                # print the sources (and whether each is enabled), no network
 *
 * Idempotent: rows are upserted by url, so run it as often as you like (cron / scheduler: every 6 h is plenty — the
 * shortest feed window is ~2-4 days). Rows published more than `--keep-days` (default 180) ago are pruned. A feed that
 * fails or returns nothing is reported and skipped; it never fails the run. Needs `ingest:infocar(:csv)` for tagging.
 * To add / disable / change a feed, edit `scripts/news-sources.json` — no code change.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { createDb, infocarVersions, newsItems } from '@carplates/db'
import type { NewsItemInsert } from '@carplates/db'
import { tagNews } from '@carplates/shared'
import { lt, sql } from 'drizzle-orm'

import { isAllowed, parseRobots } from './infocar-robots.js'
import { decodeFeed, hasCategory, newsSourcesSchema, parseFeed } from './news-parse.js'
import type { NewsSource } from './news-parse.js'

const USER_AGENT = 'carsua.app-ingest/1.0'
const SOURCES_PATH = join(import.meta.dirname, '..', 'news-sources.json')
const FETCH_TIMEOUT_MS = 20_000
const DEFAULT_KEEP_DAYS = 180

type Args = { sources: string[]; dryRun: boolean; list: boolean; keepDays: number }

function parseArgs(argv: string[]): Args {
  const a: Args = { sources: [], dryRun: false, list: false, keepDays: DEFAULT_KEEP_DAYS }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--source') a.sources.push(argv[++i] ?? '')
    else if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--list') a.list = true
    else if (arg === '--keep-days') a.keepDays = Number(argv[++i])
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function loadSources(): Promise<NewsSource[]> {
  return newsSourcesSchema.parse(JSON.parse(await readFile(SOURCES_PATH, 'utf8')))
}

/** robots.txt per host, read once per run; a host whose robots.txt can't be read is treated as allowing (no rules). */
const robotsCache = new Map<string, Promise<ReturnType<typeof parseRobots>>>()

async function isFeedAllowed(feedUrl: string): Promise<boolean> {
  const url = new URL(feedUrl)
  let rules = robotsCache.get(url.origin)
  if (!rules) {
    rules = fetch(`${url.origin}/robots.txt`, {
      headers: { 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    })
      .then(res => (res.ok ? res.text() : ''))
      .catch(() => '')
      .then(txt => parseRobots(txt, USER_AGENT))
    robotsCache.set(url.origin, rules)
  }
  return isAllowed(await rules, url.pathname + url.search)
}

async function fetchFeed(source: NewsSource): Promise<string> {
  const res = await fetch(source.url, {
    headers: { 'user-agent': USER_AGENT, accept: 'application/rss+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  })
  if (!res.ok) throw new Error(`status ${res.status}`)
  return decodeFeed(new Uint8Array(await res.arrayBuffer()), res.headers.get('content-type'))
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const all = await loadSources()

  if (args.list) {
    for (const s of all)
      log(`${s.enabled ? '✓' : '✗'} ${s.id.padEnd(20)} ${s.lang}  ${s.url}${s.note ? `  — ${s.note}` : ''}`)
    return
  }

  const unknown = args.sources.filter(id => !all.some(s => s.id === id))
  if (unknown.length) throw new Error(`unknown --source ${unknown.join(', ')} (see --list)`)
  const sources = all.filter(s => (args.sources.length ? args.sources.includes(s.id) : s.enabled))

  const { db, close } = createDb()
  try {
    const catalog = await db
      .selectDistinct({ brand: infocarVersions.brandSlug, model: infocarVersions.modelSlug })
      .from(infocarVersions)
    if (!catalog.length)
      log('warning: registry.infocar_versions is empty — items stay untagged (run ingest:infocar:csv)')
    const modelsOf = new Map<string, string[]>()
    for (const { brand, model } of catalog) modelsOf.set(brand, [...(modelsOf.get(brand) ?? []), model])
    const brandSlugs = [...modelsOf.keys()]

    let total = 0
    for (const [i, source] of sources.entries()) {
      if (i) await new Promise(resolve => setTimeout(resolve, 1000))
      try {
        if (!(await isFeedAllowed(source.url))) {
          log(`${source.id.padEnd(20)} SKIPPED robots.txt disallows ${source.url}`)
          continue
        }
        const feed = parseFeed(await fetchFeed(source))
        const parsed = source.onlyCategories ? feed.filter(item => hasCategory(item, source.onlyCategories!)) : feed
        if (!feed.length) {
          log(`${source.id.padEnd(20)} WARNING 0 items — the feed may have changed or broken`)
          continue
        }
        const dropped = feed.length - parsed.length ? ` (${feed.length - parsed.length} off-topic dropped)` : ''
        const now = new Date()
        const rows = parsed.map((item): NewsItemInsert => {
          const tag = tagNews(item, brandSlugs, brand => modelsOf.get(brand) ?? [])
          return {
            url: item.url,
            source: source.id,
            title: item.title,
            summary: item.summary,
            imageUrl: item.imageUrl,
            publishedAt: item.publishedAt ?? now,
            lang: source.lang,
            ...tag
          }
        })
        const withBrand = rows.filter(r => r.brandSlug).length
        const withModel = rows.filter(r => r.modelSlug).length
        log(
          `${source.id.padEnd(20)} ${rows.length} items · ${withBrand} with brand · ${withModel} with model${dropped}`
        )
        total += rows.length
        if (args.dryRun) continue

        await db
          .insert(newsItems)
          .values(rows)
          .onConflictDoUpdate({
            target: newsItems.url,
            set: {
              title: sql`excluded.title`,
              summary: sql`excluded.summary`,
              imageUrl: sql`excluded.image_url`,
              brandSlug: sql`excluded.brand_slug`,
              modelSlug: sql`excluded.model_slug`,
              year: sql`excluded.year`,
              fetchedAt: sql`now()`
            }
          })
      } catch (err) {
        log(`${source.id.padEnd(20)} FAILED ${String(err)} — skipped`)
      }
    }

    if (args.dryRun) {
      log(`dry run: ${total} items parsed, nothing written`)
      return
    }
    const cutoff = new Date(Date.now() - args.keepDays * 86_400_000)
    const pruned = await db.delete(newsItems).where(lt(newsItems.publishedAt, cutoff)).returning({ url: newsItems.url })
    const [count] = await db.select({ n: sql<number>`count(*)::int` }).from(newsItems)
    log(
      `done: ${total} items upserted, ${pruned.length} pruned (> ${args.keepDays} days), ${count?.n ?? 0} in the table`
    )
  } finally {
    await close()
  }
}

await main()
