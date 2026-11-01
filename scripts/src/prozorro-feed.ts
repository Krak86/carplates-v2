import { z } from 'zod'

/** Prozorro.Sale search feed: a bare JSON array of full auction objects, oldest `dateModified` first, 100 per page at most. */
export const FEED_URL = 'https://procedure.prozorro.sale/api/search/byDateModified'
export const PAGE_SIZE = 100
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const TIMEOUT_MS = 30_000
const MAX_ATTEMPTS = 5

const PageSchema = z.array(z.unknown())
const StampSchema = z.object({ auctionId: z.string(), dateModified: z.string() })

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/** 429 and 5xx are worth another try; any other 4xx is a bug in the request. */
const retryable = (status: number): boolean => status === 429 || status >= 500

/**
 * GET + JSON with a per-request timeout (an earlier month crawl stalled on one hung request) and exponential backoff on 429 / 5xx /
 * network errors. A `Retry-After` header (seconds) wins over the backoff. `wait` is injectable for tests.
 */
export async function fetchJsonRetry(
  url: string,
  wait: (ms: number) => Promise<void> = sleep,
  doFetch: typeof fetch = fetch
): Promise<unknown> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let delay = 1000 * 2 ** (attempt - 1)
    try {
      const res = await doFetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })
      if (res.ok) return await res.json()
      lastError = new Error(`HTTP ${res.status}`)
      if (!retryable(res.status)) break
      const after = Number(res.headers.get('retry-after'))
      if (Number.isFinite(after) && after > 0) delay = Math.min(after, 60) * 1000
    } catch (err) {
      lastError = err // timeout, reset connection or a truncated body
    }
    if (attempt < MAX_ATTEMPTS) await wait(delay)
  }
  throw new Error(`${url}: ${String(lastError)} (after retries)`)
}

/** `2026-10-12T17:00:03.966000Z` → `2026-10-12T17:00:03.966000` (the feed wants the date cut to 26 chars, no `Z`). */
export const cursorOf = (dateModified: string): string => dateModified.replace(/Z$/, '').slice(0, 26)

/** One microsecond later: a page that is all one timestamp would otherwise repeat forever. */
export function bumpCursor(cursor: string): string {
  const [head = '', frac = '000000'] = cursor.split('.')
  const micro = Number(frac.padEnd(6, '0')) + 1
  if (micro < 1_000_000) return `${head}.${String(micro).padStart(6, '0')}`
  const nextSecond = new Date(`${head}Z`).getTime() + 1000
  return `${new Date(nextSecond).toISOString().slice(0, 19)}.000000`
}

export type FeedStats = { pages: number; records: number }

/**
 * Walks the feed from `from` up to `to` (both ISO strings, no `Z` needed) and yields each distinct auction once, as it
 * last appeared in the range. `fetchPage(cursor)` returns one raw page. Stops on a short page, on a record past `to`, or when
 * the cursor cannot move.
 */
export async function* crawlFeed(
  fetchPage: (cursor: string) => Promise<unknown>,
  from: string,
  to: string,
  stats: FeedStats = { pages: 0, records: 0 }
): AsyncGenerator<unknown> {
  const end = new Date(to.endsWith('Z') ? to : `${to}Z`).getTime()
  let cursor = cursorOf(from)
  const seen = new Set<string>()
  for (;;) {
    const page = PageSchema.parse(await fetchPage(cursor))
    stats.pages++
    if (page.length === 0) return
    let fresh = 0
    let past = false
    for (const raw of page) {
      const stamp = StampSchema.safeParse(raw)
      const at = stamp.success ? new Date(stamp.data.dateModified).getTime() : NaN
      if (Number.isFinite(at) && at > end) {
        past = true
        continue
      }
      // A record modified twice in the range shows up twice with a different `dateModified`: both are passed on, the caller keeps the newest.
      const key = stamp.success ? `${stamp.data.auctionId}|${stamp.data.dateModified}` : null
      if (key && seen.has(key)) continue
      if (key) seen.add(key)
      stats.records++
      fresh++
      yield raw
    }
    const last = StampSchema.safeParse(page.at(-1))
    if (past || page.length < PAGE_SIZE || !last.success) return
    const next = cursorOf(last.data.dateModified)
    cursor = fresh === 0 && next === cursor ? bumpCursor(cursor) : next
  }
}

export const feedPageUrl = (cursor: string): string => `${FEED_URL}/${cursor}?limit=${PAGE_SIZE}`
