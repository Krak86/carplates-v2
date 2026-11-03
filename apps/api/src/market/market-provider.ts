import type { MarketCard, MarketKind } from '@carplates/shared'

import type { MappedDetail } from './carapis-parse.js'

export const MARKET_PROVIDER = Symbol('MARKET_PROVIDER')
export const MARKET_STORE = Symbol('MARKET_STORE')

export type ListParams = {
  brand: string
  model: string
  kind: MarketKind
  /** ISO2: only this country (`UA`). Omitted = every country (the caller filters). */
  country?: string
}

/**
 * One source of for-sale cards. CarAPIS is the only one today; another aggregator or a dealer feed is a new provider
 * plus a source badge, with no web change (docs/market-plan.md "Future-proofing").
 */
export interface MarketProvider {
  /** False without a key: the feature is off and nothing is requested. */
  readonly enabled: boolean
  /** One upstream request, up to a page of cards. */
  list(params: ListParams): Promise<MarketCard[]>
  /** One upstream request. Null when the answer was not a valid vehicle. */
  detail(id: string): Promise<MappedDetail | null>
  /** One upstream request: the provider's own slug for a model we know under another spelling, or null. */
  modelSlug(brand: string, model: string): Promise<string | null>
}

/** `rate` = 429 (never cached), `unavailable` = timeout / 5xx / bad body, `rejected` = 4xx other than 429. */
export class MarketUpstreamError extends Error {
  constructor(
    readonly reason: 'rate' | 'unavailable' | 'rejected',
    message: string
  ) {
    super(message)
  }
}

export type BudgetDay = { listUsed: number; detailUsed: number; cacheHits: number; ua: number; eu: number }
export type BudgetPatch = Partial<BudgetDay>

/** Persistence port (Postgres in production, a Map in the unit tests). */
export interface MarketStore {
  getCache(key: string): Promise<{ payload: unknown; fetchedAt: Date } | null>
  setCache(key: string, payload: unknown, at: Date): Promise<void>
  rememberListings(ids: string[], cacheKey: string, at: Date): Promise<void>
  hasListing(id: string): Promise<boolean>
  budget(day: string): Promise<BudgetDay>
  /** Adds the given amounts to the day's counters (creating the row). */
  bump(day: string, patch: BudgetPatch): Promise<void>
  /** Drops cache rows and listing ids older than `before`. */
  prune(before: Date): Promise<void>
}
