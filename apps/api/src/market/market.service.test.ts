import { HttpException, NotFoundException } from '@nestjs/common'
import { MARKET_UA_MIN_ROWS } from '@carplates/shared'
import type { MarketCard } from '@carplates/shared'
import { beforeEach, describe, expect, it } from 'vitest'

import { loadEnv } from '../env.js'
import type { MappedDetail } from './carapis-parse.js'
import { MarketUpstreamError } from './market-provider.js'
import type { BudgetDay, BudgetPatch, ListParams, MarketProvider, MarketStore } from './market-provider.js'
import {
  DAILY_LIMIT,
  DETAIL_TTL_MS,
  EMPTY_TTL_MS,
  LIST_LIMIT,
  LIST_TTL_MS,
  MarketService,
  STALE_MAX_MS
} from './market.service.js'

const card = (id: string, country: string, source = country === 'UA' ? 'auto_ria_ua' : 'autoscout24'): MarketCard => ({
  id,
  source,
  sourceName: source,
  country,
  lastSeenAt: '2026-11-02T00:00:00Z'
})
const uaCards = (n: number) => Array.from({ length: n }, (_, i) => card(`ua${i}`, 'UA'))

class FakeStore implements MarketStore {
  cache = new Map<string, { payload: unknown; fetchedAt: Date }>()
  ids = new Set<string>()
  days = new Map<string, BudgetDay>()
  async getCache(key: string) {
    return this.cache.get(key) ?? null
  }
  async setCache(key: string, payload: unknown, at: Date) {
    this.cache.set(key, { payload, fetchedAt: at })
  }
  async rememberListings(ids: string[]) {
    ids.forEach(i => this.ids.add(i))
  }
  async hasListing(id: string) {
    return this.ids.has(id)
  }
  async budget(day: string): Promise<BudgetDay> {
    return this.days.get(day) ?? { listUsed: 0, detailUsed: 0, cacheHits: 0, ua: 0, eu: 0 }
  }
  async bump(day: string, patch: BudgetPatch) {
    const cur = await this.budget(day)
    const next = { ...cur }
    for (const [k, v] of Object.entries(patch)) next[k as keyof BudgetDay] += v as number
    this.days.set(day, next)
  }
  async prune() {}
}

class FakeProvider implements MarketProvider {
  enabled = true
  calls: string[] = []
  ua: MarketCard[] = []
  all: MarketCard[] = []
  slug: string | null = null
  /** When set, the non-UA answer is `all` only for this model name (else empty). */
  allOnlyFor: string | null = null
  failWith: MarketUpstreamError | null = null
  detailResult: MappedDetail | null = {
    detail: { id: 'ua0', source: 'auto_ria_ua', sourceName: 'Auto.ria' },
    listingUrl: 'https://auto.ria.com/x.html'
  }
  async list(p: ListParams) {
    this.calls.push(`list:${p.model}:${p.country ?? 'all'}`)
    if (this.failWith) throw this.failWith
    if (p.country === 'UA') return this.ua
    return this.allOnlyFor && p.model !== this.allOnlyFor ? [] : this.all
  }
  async detail(id: string) {
    this.calls.push(`detail:${id}`)
    if (this.failWith) throw this.failWith
    return this.detailResult
  }
  async modelSlug() {
    this.calls.push('slug')
    return this.slug
  }
}

let store: FakeStore
let provider: FakeProvider
let service: MarketService
let now: Date

beforeEach(() => {
  store = new FakeStore()
  provider = new FakeProvider()
  service = new MarketService(provider, store)
  now = new Date('2026-11-03T10:00:00Z')
  service.clock = () => now
  service.env = { ...loadEnv(), MARKET_UA_ENABLED: true, MARKET_SHOW_BUDGET: true }
})

const day = () => store.budget('2026-11-03')

describe('MarketService.list', () => {
  it('answers from Ukraine with one request when it has enough cars', async () => {
    provider.ua = uaCards(MARKET_UA_MIN_ROWS)
    const res = await service.list('KIA', "CEE'D", 'passenger')
    expect(res.kind).toBe('ua')
    expect(res.items).toHaveLength(MARKET_UA_MIN_ROWS)
    expect(provider.calls).toEqual(['list:ceed:UA'])
    expect(res.budget).toEqual({ used: 1, limit: DAILY_LIMIT })
  })

  it('adds Europe, in country order, when Ukraine is under the threshold, UA cards first', async () => {
    provider.ua = uaCards(2)
    provider.all = [card('pl', 'PL'), card('de', 'DE'), card('kr', 'KR'), ...uaCards(2)]
    const res = await service.list('KIA', 'CEED', 'passenger')
    expect(res.kind).toBe('eu')
    expect(res.items.map(c => c.id)).toEqual(['ua0', 'ua1', 'de', 'pl'])
    expect(provider.calls).toEqual(['list:ceed:UA', 'list:ceed:all'])
  })

  it('does not ask for Ukraine at all when the kill switch is off, and never shows UA rows', async () => {
    service.env = { ...service.env, MARKET_UA_ENABLED: false }
    provider.all = [card('de', 'DE'), ...uaCards(1)]
    const res = await service.list('KIA', 'CEED', 'passenger')
    expect(provider.calls).toEqual(['list:ceed:all'])
    expect(res.items.map(c => c.id)).toEqual(['de'])
  })

  it('serves the second call from the cache without touching the provider', async () => {
    provider.ua = uaCards(7)
    await service.list('KIA', 'CEED', 'passenger')
    const again = await service.list('KIA', 'CEED', 'passenger')
    expect(provider.calls).toHaveLength(1)
    expect(again.items).toHaveLength(7)
    expect((await day()).cacheHits).toBe(1)
  })

  it('refreshes after the result TTL, but an empty answer expires sooner', async () => {
    provider.ua = uaCards(7)
    await service.list('KIA', 'CEED', 'passenger')
    now = new Date(now.getTime() + LIST_TTL_MS - 1000)
    await service.list('KIA', 'CEED', 'passenger')
    expect(provider.calls).toHaveLength(1)
    now = new Date(now.getTime() + 2000)
    await service.list('KIA', 'CEED', 'passenger')
    expect(provider.calls).toHaveLength(2)

    provider.ua = []
    provider.all = []
    await service.list('SKODA', 'OCTAVIA', 'passenger')
    const calls = provider.calls.length
    now = new Date(now.getTime() + EMPTY_TTL_MS - 1000)
    await service.list('SKODA', 'OCTAVIA', 'passenger')
    expect(provider.calls).toHaveLength(calls)
    now = new Date(now.getTime() + 2000)
    await service.list('SKODA', 'OCTAVIA', 'passenger')
    expect(provider.calls.length).toBeGreaterThan(calls)
  })

  it('looks the provider slug up once for an unmapped model, then remembers it', async () => {
    provider.slug = 'cd-ceed'
    provider.allOnlyFor = 'cd-ceed'
    provider.all = [card('de', 'DE')]
    const res = await service.list('KIA', 'CDCEED', 'passenger')
    expect(res.items.map(c => c.id)).toEqual(['de'])
    expect(provider.calls).toEqual(['list:cdceed:UA', 'list:cdceed:all', 'slug', 'list:cd-ceed:all'])
    // A later refresh uses the cached slug: no new lookup.
    now = new Date(now.getTime() + LIST_TTL_MS + 1000)
    provider.calls = []
    await service.list('KIA', 'CDCEED', 'passenger')
    expect(provider.calls).toEqual(['list:cd-ceed:UA', 'list:cd-ceed:all'])
  })

  it('remembers that a model has no provider slug, so the lookup is not repeated', async () => {
    await service.list('KIA', 'NOPE', 'passenger')
    expect(provider.calls.filter(c => c === 'slug')).toHaveLength(1)
    now = new Date(now.getTime() + EMPTY_TTL_MS + 1000)
    provider.calls = []
    await service.list('KIA', 'NOPE', 'passenger')
    expect(provider.calls).not.toContain('slug')
  })

  it('stops list calls at the list limit but serves a stale entry for up to 14 days', async () => {
    provider.ua = uaCards(7)
    await service.list('KIA', 'CEED', 'passenger')
    now = new Date(now.getTime() + LIST_TTL_MS + 1000)
    await store.bump('2026-11-06', { listUsed: LIST_LIMIT })
    const res = await service.list('KIA', 'CEED', 'passenger')
    expect(res.stale).toBe(true)
    expect(res.items).toHaveLength(7)
    expect(provider.calls).toHaveLength(1)
  })

  it('serves stale instead of refreshing when the day is nearly spent, and hides the block when nothing is stored', async () => {
    provider.ua = uaCards(7)
    await service.list('KIA', 'CEED', 'passenger')
    now = new Date(now.getTime() + LIST_TTL_MS + 1000)
    await store.bump('2026-11-06', { detailUsed: DAILY_LIMIT - 5 })
    expect((await service.list('KIA', 'CEED', 'passenger')).stale).toBe(true)
    const none = await service.list('SKODA', 'OCTAVIA', 'passenger')
    expect(none.kind).toBe('none')
  })

  it('does not serve an entry older than 14 days', async () => {
    provider.ua = uaCards(7)
    await service.list('KIA', 'CEED', 'passenger')
    now = new Date(now.getTime() + STALE_MAX_MS + 1000)
    await store.bump('2026-11-17', { listUsed: LIST_LIMIT })
    expect((await service.list('KIA', 'CEED', 'passenger')).kind).toBe('none')
  })

  it('never caches a 429 and fills the day so nothing else is sent', async () => {
    provider.failWith = new MarketUpstreamError('rate', '429')
    expect((await service.list('KIA', 'CEED', 'passenger')).kind).toBe('none')
    expect(store.cache.size).toBe(0)
    expect((await day()).listUsed).toBeGreaterThanOrEqual(LIST_LIMIT)
    provider.calls = []
    await service.list('SKODA', 'OCTAVIA', 'passenger')
    expect(provider.calls).toHaveLength(0)
  })

  it('does not cache an upstream failure and falls back to the stale entry when there is one', async () => {
    provider.ua = uaCards(7)
    await service.list('KIA', 'CEED', 'passenger')
    now = new Date(now.getTime() + LIST_TTL_MS + 1000)
    provider.failWith = new MarketUpstreamError('unavailable', '502')
    const res = await service.list('KIA', 'CEED', 'passenger')
    expect(res.stale).toBe(true)
    expect(res.items).toHaveLength(7)
  })

  it('is off without a key and for a brand it cannot map', async () => {
    provider.enabled = false
    expect((await service.list('KIA', 'CEED', 'passenger')).kind).toBe('none')
    provider.enabled = true
    expect((await service.list('NO SUCH BRAND', 'CEED', 'passenger')).kind).toBe('none')
    expect(provider.calls).toHaveLength(0)
  })

  it('hides the counter when MARKET_SHOW_BUDGET is off', async () => {
    service.env = { ...service.env, MARKET_SHOW_BUDGET: false }
    provider.ua = uaCards(7)
    expect((await service.list('KIA', 'CEED', 'passenger')).budget).toBeNull()
  })

  it('shares one upstream flow between concurrent calls for the same model', async () => {
    provider.ua = uaCards(7)
    await Promise.all([
      service.list('KIA', 'CEED', 'passenger'),
      service.list('KIA', 'CEED', 'passenger'),
      service.list('KIA', 'CEED', 'passenger')
    ])
    expect(provider.calls).toHaveLength(1)
  })
})

describe('MarketService.listingUrl / detail', () => {
  it('rejects an id that never appeared in a cached list (no open proxy)', async () => {
    await expect(service.listingUrl('deadbeef-0000')).rejects.toBeInstanceOf(NotFoundException)
    expect(provider.calls).toHaveLength(0)
  })

  it('redirects a known id with one detail request, then from the cache', async () => {
    provider.ua = uaCards(7)
    await service.list('KIA', 'CEED', 'passenger')
    provider.calls = []
    expect(await service.listingUrl('ua0')).toBe('https://auto.ria.com/x.html')
    expect((await service.detail('ua0')).sourceName).toBe('Auto.ria')
    expect(provider.calls).toEqual(['detail:ua0'])
    expect((await day()).detailUsed).toBe(1)
  })

  it('refetches a detail after a week', async () => {
    provider.ua = uaCards(7)
    await service.list('KIA', 'CEED', 'passenger')
    await service.listingUrl('ua0')
    now = new Date(now.getTime() + DETAIL_TTL_MS + 1000)
    await service.listingUrl('ua0')
    expect(provider.calls.filter(c => c.startsWith('detail'))).toHaveLength(2)
  })

  it('answers 204 over budget instead of calling upstream, and does not cache a failure', async () => {
    provider.ua = uaCards(7)
    await service.list('KIA', 'CEED', 'passenger')
    await store.bump('2026-11-03', { detailUsed: DAILY_LIMIT })
    provider.calls = []
    await expect(service.listingUrl('ua0')).rejects.toMatchObject({ status: 204 })
    expect(provider.calls).toHaveLength(0)

    await store.days.clear()
    provider.failWith = new MarketUpstreamError('unavailable', '502')
    await expect(service.listingUrl('ua0')).rejects.toBeInstanceOf(HttpException)
    expect(store.cache.has('detail:ua0')).toBe(false)
  })
})

describe('MarketService.stats', () => {
  it('reports today for the admin tile, and null when off', async () => {
    provider.ua = uaCards(7)
    await service.list('KIA', 'CEED', 'passenger')
    expect(await service.stats()).toEqual({ used: 1, limit: DAILY_LIMIT, cacheHits: 0, ua: 1, eu: 0 })
    provider.enabled = false
    expect(await service.stats()).toBeNull()
  })
})
