import type { MarketBudget, MarketCard, MarketKind } from '@carplates/shared'

/** What the "Cars for sale" block reads from `useMarketActions`. */
export type MarketView = {
  /** `ua` = Auto.ria rows, `eu` = the European fallback (Ukrainian cards, if any, come first). */
  dataset: 'ua' | 'eu'
  cards: MarketCard[]
  /** True when the API served an expired entry because the daily budget is low. */
  stale: boolean
  fetchedAt: string | null
  /** Requests used today; null when the API hides the counter (`MARKET_SHOW_BUDGET` off). */
  budget: MarketBudget | null
}

export type MarketActions = {
  /** Still loading (the query is off until the section is open). */
  isPending: boolean
  /** The API said "nothing to show" (`none`), the feature is off, or the request failed: the block hides. */
  view: MarketView | null
}

export type MarketTarget = {
  brand: string | null
  model: string | null | undefined
  /** Registry `kind` text or an already resolved kind; anything the block does not handle hides it. */
  kind?: string | null
  /** Make year of the car, used to float the same-year cards first. */
  year?: number | null
}

export type ResolvedMarketKind = MarketKind | null
