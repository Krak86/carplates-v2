import { describe, expect, it, vi } from 'vitest'

import { PAGE_SIZE, bumpCursor, crawlFeed, cursorOf, fetchJsonRetry } from './prozorro-feed.js'
import type { FeedStats } from './prozorro-feed.js'

const rec = (id: string, at: string): { auctionId: string; dateModified: string } => ({
  auctionId: id,
  dateModified: at
})

const collect = async (gen: AsyncGenerator<unknown>): Promise<unknown[]> => {
  const out: unknown[] = []
  for await (const r of gen) out.push(r)
  return out
}

describe('feed cursor', () => {
  it('cuts the feed date to 26 chars without Z', () => {
    expect(cursorOf('2026-10-12T17:00:03.966000Z')).toBe('2026-10-12T17:00:03.966000')
    expect(cursorOf('2026-10-12T17:00:03.966Z')).toBe('2026-10-12T17:00:03.966')
  })

  it('moves one microsecond, carrying into the next second', () => {
    expect(bumpCursor('2026-10-12T17:00:03.966000')).toBe('2026-10-12T17:00:03.966001')
    expect(bumpCursor('2026-10-12T17:00:03.999999')).toBe('2026-10-12T17:00:04.000000')
    expect(bumpCursor('2026-10-12T23:59:59.999999')).toBe('2026-10-13T00:00:00.000000')
  })
})

describe('crawlFeed', () => {
  it('pages by the last dateModified until a short page and counts distinct records', async () => {
    const page1 = Array.from({ length: PAGE_SIZE }, (_, i) =>
      rec(`A-${i}`, `2026-10-01T00:00:${String(i % 60).padStart(2, '0')}.000000Z`)
    )
    const page2 = [rec('A-99', page1.at(-1)?.dateModified ?? ''), rec('B-1', '2026-10-02T00:00:00.000000Z')]
    const seen: string[] = []
    const fetchPage = vi.fn((cursor: string) => {
      seen.push(cursor)
      return Promise.resolve(seen.length === 1 ? page1 : page2)
    })
    const stats: FeedStats = { pages: 0, records: 0 }
    const out = await collect(crawlFeed(fetchPage, '2026-10-01T00:00:00.000000', '2026-10-05T00:00:00Z', stats))
    // the boundary record comes back on page 2 (same id and time) and is yielded once
    expect(out).toHaveLength(PAGE_SIZE + 1)
    expect(stats).toEqual({ pages: 2, records: PAGE_SIZE + 1 })
    expect(seen[0]).toBe('2026-10-01T00:00:00.000000')
    expect(seen[1]).toBe(cursorOf(page1.at(-1)?.dateModified ?? ''))
  })

  it('stops at the first record past the end date and drops it', async () => {
    const fetchPage = vi.fn(() =>
      Promise.resolve([rec('A', '2026-10-01T00:00:00.000000Z'), rec('B', '2026-10-09T00:00:00.000000Z')])
    )
    const out = await collect(crawlFeed(fetchPage, '2026-10-01T00:00:00', '2026-10-05T00:00:00'))
    expect(out).toEqual([rec('A', '2026-10-01T00:00:00.000000Z')])
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('does not loop on a full page of one timestamp', async () => {
    const same = Array.from({ length: PAGE_SIZE }, (_, i) => rec(`S-${i}`, '2026-10-01T00:00:00.000000Z'))
    const cursors: string[] = []
    const fetchPage = (cursor: string): Promise<unknown> => {
      cursors.push(cursor)
      // the second call (after the bump) is a different, short page
      return Promise.resolve(cursors.length === 1 ? same : cursors.length === 2 ? same : [])
    }
    const out = await collect(crawlFeed(fetchPage, '2026-10-01T00:00:00.000000', '2026-10-05T00:00:00Z'))
    expect(out).toHaveLength(PAGE_SIZE)
    expect(cursors.slice(0, 3)).toEqual([
      '2026-10-01T00:00:00.000000',
      '2026-10-01T00:00:00.000000',
      '2026-10-01T00:00:00.000001'
    ])
  })

  it('returns on an empty page', async () => {
    expect(await collect(crawlFeed(() => Promise.resolve([]), '2026-10-01T00:00:00', '2026-10-05T00:00:00'))).toEqual(
      []
    )
  })
})

describe('fetchJsonRetry', () => {
  const ok = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200 })

  it('retries 429 and 5xx with a growing delay, then returns the body', async () => {
    const responses = [
      new Response('', { status: 429, headers: { 'retry-after': '3' } }),
      new Response('', { status: 503 }),
      ok([1])
    ]
    const doFetch = vi.fn(() => Promise.resolve(responses.shift() as Response)) as unknown as typeof fetch
    const waits: number[] = []
    const body = await fetchJsonRetry('https://x.test/a', ms => (waits.push(ms), Promise.resolve()), doFetch)
    expect(body).toEqual([1])
    expect(waits).toEqual([3000, 2000])
  })

  it('retries a network error', async () => {
    const doFetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(ok({ fine: true })) as unknown as typeof fetch
    expect(await fetchJsonRetry('https://x.test/a', () => Promise.resolve(), doFetch)).toEqual({ fine: true })
  })

  it('fails fast on a 404 and gives up after the attempts on a persistent 500', async () => {
    const notFound = vi.fn(() => Promise.resolve(new Response('', { status: 404 }))) as unknown as typeof fetch
    await expect(fetchJsonRetry('https://x.test/a', () => Promise.resolve(), notFound)).rejects.toThrow('HTTP 404')
    expect(notFound).toHaveBeenCalledTimes(1)
    const broken = vi.fn(() => Promise.resolve(new Response('', { status: 500 }))) as unknown as typeof fetch
    await expect(fetchJsonRetry('https://x.test/a', () => Promise.resolve(), broken)).rejects.toThrow('HTTP 500')
    expect(broken).toHaveBeenCalledTimes(5)
  })
})
