import { HttpException, HttpStatus, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import {
  MARKET_COUNTRY_ORDER,
  MARKET_UA_MIN_ROWS,
  MARKET_UA_SOURCE,
  brandSlug,
  marketCountryRank,
  marketDetailSchema,
  marketResponseSchema,
  modelKey,
  sortMarketCards
} from '@carplates/shared'
import type { MarketCard, MarketDetail, MarketKind, MarketResponse } from '@carplates/shared'
import { z } from 'zod'

import { loadEnv } from '../env.js'
import type { Env } from '../env.js'
import { MARKET_PROVIDER, MARKET_STORE, MarketUpstreamError } from './market-provider.js'
import type { MarketProvider, MarketStore } from './market-provider.js'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
/** A fresh list answer; an empty one is retried sooner (a model may get listings tomorrow). */
export const LIST_TTL_MS = 3 * DAY_MS
export const EMPTY_TTL_MS = DAY_MS
/** An expired entry may still be served this long while the budget is low, or the upstream is failing. */
export const STALE_MAX_MS = 14 * DAY_MS
export const DETAIL_TTL_MS = 7 * DAY_MS
/** The slug lookup is the same for a month; a "no such model" answer is remembered too. */
export const SLUG_TTL_MS = 30 * DAY_MS

/** CarAPIS free tier: 100 requests a day. List calls stop at 85 so detail clicks (the redirect) keep a reserve. */
export const DAILY_LIMIT = 100
export const LIST_LIMIT = 85
/** Below this many requests left, an expired entry is served stale instead of being refreshed. */
export const LOW_BUDGET = 15

const storedListSchema = marketResponseSchema.pick({ kind: true, items: true })
const storedDetailSchema = z.object({ detail: marketDetailSchema, listingUrl: z.string().nullable() })
const storedSlugSchema = z.object({ slug: z.string().nullable() })

type Stored = { kind: MarketResponse['kind']; items: MarketCard[] }

/**
 * "Cars for sale" for a make + model: Ukraine (Auto.ria, delivered by CarAPIS) first, then Europe when Ukraine has too few.
 * Every upstream call is counted against the daily budget (CarAPIS sends no rate-limit header); answers are cached in
 * Postgres so a deploy or a restart does not spend the quota again. Never cached: a 429 or any failure.
 */
@Injectable()
export class MarketService {
  private readonly log = new Logger(MarketService.name)
  /** Overridable in tests. */
  env: Env = loadEnv()
  clock: () => Date = () => new Date()
  private readonly inflight = new Map<string, Promise<MarketResponse>>()

  constructor(
    @Inject(MARKET_PROVIDER) private readonly provider: MarketProvider,
    @Inject(MARKET_STORE) private readonly store: MarketStore
  ) {}

  get enabled(): boolean {
    return this.provider.enabled
  }

  /** `GET /api/market/:make/:model`. Unknown model, feature off or no budget = `kind: 'none'` (the web hides the block). */
  async list(make: string, model: string, kind: MarketKind): Promise<MarketResponse> {
    const brand = brandSlug(make)
    const modelSlug = modelKey(model)
    if (!this.enabled || !brand || !modelSlug) return this.respond({ kind: 'none', items: [] }, null, false)
    const key = `list:${kind}:${brand}:${modelSlug}`
    const pending = this.inflight.get(key)
    if (pending) return pending
    const run = this.resolveList(key, brand, modelSlug, kind).finally(() => this.inflight.delete(key))
    this.inflight.set(key, run)
    return run
  }

  private async resolveList(key: string, brand: string, model: string, kind: MarketKind): Promise<MarketResponse> {
    const now = this.clock()
    const cached = await this.readList(key)
    const age = cached ? now.getTime() - cached.at.getTime() : Infinity
    const ttl = cached && cached.value.items.length ? LIST_TTL_MS : EMPTY_TTL_MS
    if (cached && age < ttl) {
      await this.store.bump(this.day(), { cacheHits: 1 })
      return this.respond(cached.value, cached.at, false)
    }
    const stale = cached && age < STALE_MAX_MS ? cached : null
    const used = await this.used()
    if (used.list >= LIST_LIMIT || DAILY_LIMIT - used.total < LOW_BUDGET) {
      return stale ? this.respond(stale.value, stale.at, true) : this.respond({ kind: 'none', items: [] }, null, false)
    }
    try {
      const value = await this.fetchList(brand, model, kind)
      await this.store.setCache(key, value, now)
      await this.store.rememberListings(
        value.items.map(c => c.id),
        key,
        now
      )
      void this.store.prune(new Date(now.getTime() - STALE_MAX_MS)).catch(() => undefined)
      return this.respond(value, now, false)
    } catch (err) {
      if (!(err instanceof MarketUpstreamError)) throw err
      this.log.warn(`list ${key} failed (${err.reason}); ${stale ? 'serving stale' : 'nothing to show'}`)
      return stale ? this.respond(stale.value, stale.at, true) : this.respond({ kind: 'none', items: [] }, null, false)
    }
  }

  /** Ukraine first (one request); under the threshold, add Europe (a second) and, for an unmapped model, a slug lookup (a third). */
  private async fetchList(brand: string, model: string, kind: MarketKind): Promise<Stored> {
    const slug = await this.cachedSlug(brand, model)
    let upstreamModel = slug ?? model
    let ua: MarketCard[] = []
    if (this.env.MARKET_UA_ENABLED) {
      ua = (await this.call(() => this.provider.list({ brand, model: upstreamModel, kind, country: 'UA' }))).filter(
        c => c.source === MARKET_UA_SOURCE
      )
    }
    if (ua.length >= MARKET_UA_MIN_ROWS) {
      await this.store.bump(this.day(), { ua: 1 })
      return { kind: 'ua', items: ua }
    }
    let eu = await this.europe(brand, upstreamModel, kind)
    if (!ua.length && !eu.length && slug === undefined) {
      // Nothing under our spelling: one lookup for the provider's own slug, then one more try with it.
      const found = await this.resolveSlug(brand, model)
      if (found && found !== upstreamModel) {
        upstreamModel = found
        eu = await this.europe(brand, upstreamModel, kind)
      }
    }
    await this.store.bump(this.day(), eu.length ? { eu: 1 } : {})
    if (!ua.length && !eu.length) return { kind: 'none', items: [] }
    return eu.length ? { kind: 'eu', items: [...ua, ...eu] } : { kind: 'ua', items: ua }
  }

  /** Non-UA cards from the countries Ukraine imports from, in `MARKET_COUNTRY_ORDER`. UA rows in the same answer are kept apart. */
  private async europe(brand: string, model: string, kind: MarketKind): Promise<MarketCard[]> {
    const used = await this.used()
    if (used.list >= LIST_LIMIT) return []
    const rows = await this.call(() => this.provider.list({ brand, model, kind }))
    return sortMarketCards(
      rows.filter(c => c.country !== 'UA' && marketCountryRank(c.country) < MARKET_COUNTRY_ORDER.length)
    )
  }

  /** The cached provider slug: a string, null = "known to have none", undefined = never looked up. */
  private async cachedSlug(brand: string, model: string): Promise<string | null | undefined> {
    const row = await this.store.getCache(`slug:${brand}:${model}`)
    if (!row || this.clock().getTime() - row.fetchedAt.getTime() > SLUG_TTL_MS) return undefined
    const parsed = storedSlugSchema.safeParse(row.payload)
    return parsed.success ? parsed.data.slug : undefined
  }

  private async resolveSlug(brand: string, model: string): Promise<string | null> {
    const used = await this.used()
    if (used.list >= LIST_LIMIT) return null
    const slug = await this.call(() => this.provider.modelSlug(brand, model))
    await this.store.setCache(`slug:${brand}:${model}`, { slug }, this.clock())
    return slug
  }

  /** `GET /api/market/vehicle/:id`: only ids seen in a cached list; one upstream request per week and id. */
  async detail(id: string): Promise<MarketDetail> {
    return (await this.mappedDetail(id)).detail
  }

  /** `GET /api/market/go/:id`: the outbound listing link, or null when it is not known (the web falls back to a search link). */
  async listingUrl(id: string): Promise<string | null> {
    return (await this.mappedDetail(id)).listingUrl
  }

  private async mappedDetail(id: string): Promise<{ detail: MarketDetail; listingUrl: string | null }> {
    if (!this.enabled) throw new HttpException('Market is off', HttpStatus.NO_CONTENT)
    if (!(await this.store.hasListing(id))) throw new NotFoundException('Unknown listing')
    const key = `detail:${id}`
    const now = this.clock()
    const cached = await this.store.getCache(key)
    const parsed = cached ? storedDetailSchema.safeParse(cached.payload) : null
    if (cached && parsed?.success && now.getTime() - cached.fetchedAt.getTime() < DETAIL_TTL_MS) {
      await this.store.bump(this.day(), { cacheHits: 1 })
      return parsed.data
    }
    const used = await this.used()
    if (used.total >= DAILY_LIMIT) {
      if (parsed?.success) return parsed.data
      throw new HttpException('Over budget', HttpStatus.NO_CONTENT)
    }
    try {
      const mapped = await this.call(() => this.provider.detail(id), 'detailUsed')
      if (!mapped) throw new NotFoundException('Listing is gone')
      await this.store.setCache(key, mapped, now)
      return mapped
    } catch (err) {
      if (!(err instanceof MarketUpstreamError)) throw err
      if (parsed?.success) return parsed.data
      throw new HttpException('Upstream unavailable', HttpStatus.NO_CONTENT)
    }
  }

  /** Today's counters for the admin Server tab; null when the feature is off. */
  async stats(): Promise<{ used: number; limit: number; cacheHits: number; ua: number; eu: number } | null> {
    if (!this.enabled) return null
    const b = await this.store.budget(this.day())
    return { used: b.listUsed + b.detailUsed, limit: DAILY_LIMIT, cacheHits: b.cacheHits, ua: b.ua, eu: b.eu }
  }

  /** One counted upstream request. The count is taken before the call: a failed call still used quota upstream. */
  private async call<T>(fn: () => Promise<T>, counter: 'listUsed' | 'detailUsed' = 'listUsed'): Promise<T> {
    await this.store.bump(this.day(), { [counter]: 1 })
    try {
      return await fn()
    } catch (err) {
      if (err instanceof MarketUpstreamError && err.reason === 'rate') {
        // Upstream says the day is spent (our count was low): fill the counter so nothing else is sent until 00:00 UTC.
        const used = await this.used()
        await this.store.bump(this.day(), { listUsed: Math.max(0, DAILY_LIMIT - used.total) })
      }
      throw err
    }
  }

  private async used(): Promise<{ list: number; total: number }> {
    const b = await this.store.budget(this.day())
    return { list: b.listUsed, total: b.listUsed + b.detailUsed }
  }

  private day(): string {
    return this.clock().toISOString().slice(0, 10)
  }

  private async readList(key: string): Promise<{ value: Stored; at: Date } | null> {
    const row = await this.store.getCache(key)
    if (!row) return null
    const parsed = storedListSchema.safeParse(row.payload)
    return parsed.success ? { value: parsed.data, at: row.fetchedAt } : null
  }

  private async respond(value: Stored, at: Date | null, stale: boolean): Promise<MarketResponse> {
    const budget = this.env.MARKET_SHOW_BUDGET && this.enabled ? await this.store.budget(this.day()) : null
    return {
      kind: value.kind,
      items: value.items,
      fetchedAt: at?.toISOString() ?? null,
      stale,
      budget: budget ? { used: budget.listUsed + budget.detailUsed, limit: DAILY_LIMIT } : null
    }
  }
}
