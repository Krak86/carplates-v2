import { z } from 'zod'

/**
 * "Cars for sale" block of the Cars in stock section (CarAPIS listings, `docs/market-plan.md`). Own file, not `schemas.ts`,
 * so adding a field does not bust offline caches: every new field is `.nullable().optional()`.
 * The data is shown to our own users only; never write it to seed CSVs or expose it as a raw feed (CarAPIS terms).
 */

/** Vehicle kinds the block handles (registry `VehicleKind` subset). Motorcycles are not mapped: untested in the catalogue. */
export const MARKET_KINDS = ['passenger', 'truck', 'bus'] as const
export type MarketKind = (typeof MARKET_KINDS)[number]
export const DEFAULT_MARKET_KIND: MarketKind = 'passenger'

/**
 * CarAPIS `body_type` filter per kind. Passenger sends none (the model slug already narrows it); truck / bus use the single value
 * probed on 2026-11-03 (a comma list is untested, so it is not used).
 */
export const MARKET_BODY_FILTER: Readonly<Record<MarketKind, string | null>> = {
  passenger: null,
  truck: 'truck',
  bus: 'bus'
}

/** The Ukrainian rows come from this one source (delivered by CarAPIS, we fetch nothing from auto.ria.com ourselves). */
export const MARKET_UA_SOURCE = 'auto_ria_ua'

/** Fewer Ukrainian rows than this and the API makes a second, non-UA request. */
export const MARKET_UA_MIN_ROWS = 6

/**
 * Where to look when Ukraine has too few cars: the countries Ukraine imports from, restricted to what the free CarAPIS
 * catalogue holds as `live` (checked 2026-11-03: no US source exists). Explicit, not derived: order is a decision. Unlisted
 * countries sort last.
 */
export const MARKET_COUNTRY_ORDER = ['DE', 'PL', 'FR', 'IT', 'BE', 'NL', 'AT', 'CZ', 'SK', 'RO', 'GB', 'CA'] as const

export function marketCountryRank(iso2: string | null | undefined): number {
  const i = (MARKET_COUNTRY_ORDER as readonly string[]).indexOf((iso2 ?? '').toUpperCase())
  return i === -1 ? MARKET_COUNTRY_ORDER.length : i
}

/** Display names of the sources we expect; an unknown code is shown as is. */
export const MARKET_SOURCE_NAMES: Readonly<Record<string, string>> = {
  auto_ria_ua: 'Auto.ria',
  autoscout24: 'AutoScout24',
  kleinanzeigen: 'Kleinanzeigen',
  otomoto: 'Otomoto',
  leboncoin: 'Leboncoin',
  subito: 'Subito',
  automobile_it: 'Automobile.it',
  tweedehands_be: 'Tweedehands',
  ememain_be: 'Ememain',
  marktplaats: 'Marktplaats',
  willhaben: 'Willhaben',
  bazos_cz: 'Bazos',
  autobazar_eu: 'Autobazar.eu',
  autovit: 'Autovit',
  autotrader: 'Autotrader UK',
  autotrader_ca: 'Autotrader CA',
  kijiji_ca: 'Kijiji'
}

export function marketSourceName(code: string): string {
  return MARKET_SOURCE_NAMES[code] ?? code
}

export const marketKindSchema = z.enum(MARKET_KINDS)

/** `GET /api/market/:make/:model?kind=` */
export const marketQuerySchema = z.object({
  kind: marketKindSchema.default(DEFAULT_MARKET_KIND)
})
export type MarketQuery = z.infer<typeof marketQuerySchema>

export const marketParamsSchema = z.object({
  make: z.string().min(1).max(60),
  model: z.string().min(1).max(60)
})
export type MarketParams = z.infer<typeof marketParamsSchema>

/** `:id` of the detail and redirect endpoints (a CarAPIS vehicle id, a UUID). */
export const marketIdSchema = z.string().regex(/^[0-9a-f-]{8,64}$/i)

export const marketCardSchema = z.object({
  id: z.string(),
  /** CarAPIS source code, e.g. `auto_ria_ua`. */
  source: z.string(),
  /** Display name of the source (`Auto.ria`), resolved by the API. */
  sourceName: z.string(),
  country: z.string().nullable().optional(),
  year: z.number().nullable().optional(),
  trim: z.string().nullable().optional(),
  priceUsd: z.number().nullable().optional(),
  priceOriginal: z.number().nullable().optional(),
  currencyOriginal: z.string().nullable().optional(),
  mileage: z.number().nullable().optional(),
  fuel: z.string().nullable().optional(),
  transmission: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  thumb: z.string().nullable().optional(),
  lastSeenAt: z.string().nullable().optional(),
  hasAccident: z.boolean().nullable().optional()
})
export type MarketCard = z.infer<typeof marketCardSchema>

export const marketBudgetSchema = z.object({ used: z.number(), limit: z.number() })
export type MarketBudget = z.infer<typeof marketBudgetSchema>

export const marketResponseSchema = z.object({
  /** `ua` = Auto.ria rows; `eu` = the non-UA fallback; `none` = nothing to show (hide the block). */
  kind: z.enum(['ua', 'eu', 'none']),
  items: z.array(marketCardSchema),
  fetchedAt: z.string().nullable().optional(),
  /** True when an expired entry was served because the daily budget is low. */
  stale: z.boolean().nullable().optional(),
  /** Requests used today; null when `MARKET_SHOW_BUDGET` is off. */
  budget: marketBudgetSchema.nullable().optional()
})
export type MarketResponse = z.infer<typeof marketResponseSchema>

/** `GET /api/market/vehicle/:id` - the modal. `listingUrl` is never sent: the link is `/api/market/go/:id`. */
export const marketDetailSchema = z.object({
  id: z.string(),
  source: z.string(),
  sourceName: z.string(),
  /** Machine-written summary; label it as such. */
  description: z.string().nullable().optional(),
  photos: z.array(z.string()).nullable().optional(),
  engineCc: z.number().nullable().optional(),
  driveType: z.string().nullable().optional(),
  seatCount: z.number().nullable().optional(),
  ownerCount: z.number().nullable().optional(),
  warrantyType: z.string().nullable().optional(),
  inspectionPassed: z.boolean().nullable().optional(),
  hasAccident: z.boolean().nullable().optional(),
  hasRecall: z.boolean().nullable().optional(),
  isUndervalued: z.boolean().nullable().optional(),
  isAvailable: z.boolean().nullable().optional(),
  availabilityCheckedAt: z.string().nullable().optional(),
  lastSeenAt: z.string().nullable().optional()
})
export type MarketDetail = z.infer<typeof marketDetailSchema>

/** Stable order of a fallback list: by `MARKET_COUNTRY_ORDER`, then newest `lastSeenAt`. */
export function sortMarketCards(cards: readonly MarketCard[]): MarketCard[] {
  return [...cards].sort(
    (a, b) =>
      marketCountryRank(a.country) - marketCountryRank(b.country) ||
      (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? '')
  )
}
