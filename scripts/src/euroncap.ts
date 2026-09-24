/**
 * Offline scrape of euroncap.com crash-test ratings into `registry.euroncap_ratings`.
 *
 *   pnpm ingest:euroncap                  # every assessment in the sitemap
 *   pnpm ingest:euroncap -- --limit 20    # quick dev slice
 *   pnpm ingest:euroncap -- --dry-run     # parse + count, write nothing
 *   pnpm ingest:euroncap -- --refresh     # re-fetch pages already cached on disk
 *
 * Euro NCAP has no public API (robots.txt blocks /api/ anyway), so this discovers
 * every `/assessments/{make}/{model}/{id}/` URL from their sitemap.xml and parses
 * the server-rendered HTML of each (see euroncap-parse.ts). Unlike the CKAN
 * ingest, this never touches `registrations` — it only writes to its own table,
 * and is meant to be re-run every few months to pick up new/updated ratings.
 *
 * Every fetched page is cached to scripts/.data/euroncap/ — a re-run without
 * --refresh reads from disk and makes no network requests at all, the same
 * caching discipline as the CKAN ZIPs in ingest.ts. Requests are throttled to
 * one per 1.5s with an identifying User-Agent — a few hundred pages, so a full
 * fresh run takes 15-25 minutes.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { createDb, euroncapRatings } from '@carplates/db'
import type { Db, EuroncapRatingInsert } from '@carplates/db'

import { parseAssessment } from './euroncap-parse.js'

const SITEMAP_URL = 'https://www.euroncap.com/sitemap.xml'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const REQUEST_DELAY_MS = 1500
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'euroncap')
const PROGRESS_EVERY = 25

// Sitemap URLs never carry query params, so this can't match the robots.txt-disallowed
// `/*?id=*` pattern — nothing else needs filtering out.
const ASSESSMENT_URL_RE = /https:\/\/www\.euroncap\.com\/assessments\/[^/"\s]+\/[^/"\s]+\/[^/"\s]+\/?/g

interface Args {
  limit?: number
  dryRun: boolean
  refresh: boolean
}

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false, refresh: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--limit') a.limit = Number(argv[++i])
    else if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--refresh') a.refresh = true
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

async function fetchAssessmentUrls(): Promise<string[]> {
  const res = await fetch(SITEMAP_URL, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`sitemap ${res.status}`)
  const xml = await res.text()
  return [...new Set([...xml.matchAll(ASSESSMENT_URL_RE)].map(m => m[0]))]
}

/** `{make}_{model}_{id}.html` — readable on disk, and unique per assessment. */
function cachePathFor(url: string): string {
  const parts = url.replace('https://www.euroncap.com/assessments/', '').replace(/\/+$/, '').split('/')
  return join(DATA_DIR, `${parts.join('_')}.html`)
}

/** Returns the HTML plus whether it came from disk (so the caller knows whether to throttle). */
async function fetchHtml(url: string, refresh: boolean): Promise<{ html: string; cached: boolean }> {
  const cachePath = cachePathFor(url)
  if (!refresh && existsSync(cachePath)) {
    return { html: await readFile(cachePath, 'utf8'), cached: true }
  }
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`status ${res.status}`)
  const html = await res.text()
  await writeFile(cachePath, html)
  return { html, cached: false }
}

async function upsert(db: Db, row: EuroncapRatingInsert): Promise<void> {
  const { assessmentId, ...rest } = row
  await db
    .insert(euroncapRatings)
    .values(row)
    .onConflictDoUpdate({ target: euroncapRatings.assessmentId, set: { ...rest, scrapedAt: new Date() } })
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  await mkdir(DATA_DIR, { recursive: true })

  log('fetching sitemap …')
  let urls = await fetchAssessmentUrls()
  log(`found ${urls.length} assessment URL(s) in the sitemap`)
  if (args.limit) urls = urls.slice(0, args.limit)

  const { db, close } = createDb()
  try {
    let written = 0
    let failed = 0
    for (const url of urls) {
      try {
        const { html, cached } = await fetchHtml(url, args.refresh)
        if (!cached) await sleep(REQUEST_DELAY_MS)

        const row = parseAssessment(html, url)
        if (!row) {
          log(`warn: not a recognizable assessment page — ${url}`)
          failed++
          continue
        }

        if (!args.dryRun) await upsert(db, row)
        written++
        if (written % PROGRESS_EVERY === 0) log(`  … ${written}/${urls.length} done`)
      } catch (err) {
        log(`warn: failed on ${url} — ${(err as Error).message}`)
        failed++
      }
    }
    log(
      `done: ${written} ${args.dryRun ? 'parsed (dry-run, not written)' : 'upserted'}, ${failed} failed, out of ${urls.length}`
    )
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
