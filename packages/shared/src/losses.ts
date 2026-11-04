import { z } from 'zod'

/**
 * Russian war losses as reported by the General Staff of Ukraine ("approximate" figures), relayed by the community API
 * russianwarship.rip (third-party, no docs / SLA, so we keep our own daily copy). Own contract file: online-only, never part
 * of `schemas.ts` / the offline cache. New fields here are `.nullable().optional()`.
 */

/** Base of the upstream API; the only place the URL lives (API fetcher and backfill script both import it). */
export const LOSSES_SOURCE_URL = 'https://russianwarship.rip/api/v2'

/** The 15 numeric categories upstream reports (checked 2026-11-05). `/terms` is 404, so names live in our i18n (`losses.cat.*`). */
export const LOSS_CATEGORIES = [
  'personnel_units',
  'tanks',
  'armoured_fighting_vehicles',
  'artillery_systems',
  'mlrs',
  'aa_warfare_systems',
  'planes',
  'helicopters',
  'vehicles_fuel_tanks',
  'warships_cutters',
  'cruise_missiles',
  'uav_systems',
  'special_military_equip',
  'atgm_srbm_systems',
  'submarines'
] as const
export type LossCategory = (typeof LOSS_CATEGORIES)[number]

/** Shown first on the page and in the history chart. Explicit, not `LOSS_CATEGORIES[0]`. */
export const DEFAULT_LOSS_CATEGORY: LossCategory = 'personnel_units'

/** Counters keyed by category (an `increase` can be negative when upstream corrects an earlier day). Values are optional so a category added or dropped upstream never breaks parsing. */
const countersSchema = z.record(z.string(), z.number().int().nullish())
export type LossCounters = z.infer<typeof countersSchema>

/** One record of `GET /statistics/latest` (`data`) and `GET /statistics?offset=&limit=` (`data.records[]`). Enums stay loose. */
export const upstreamLossRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  day: z.number().int().nullish(),
  resource: z.string().nullish(),
  stats: countersSchema,
  increase: countersSchema.nullish()
})
export type UpstreamLossRecord = z.infer<typeof upstreamLossRecordSchema>

export const upstreamLossLatestSchema = z.object({ data: upstreamLossRecordSchema })
export const upstreamLossPageSchema = z.object({
  data: z.object({
    records: z.array(upstreamLossRecordSchema),
    paging: z.object({ next_url: z.string().nullish() }).nullish()
  })
})

/** `GET /api/losses`: the newest stored day. `sourceUrl` is the General Staff post upstream links to (may be absent). */
export const lossesResponseSchema = z.object({
  date: z.string(),
  day: z.number().int().nullable(),
  stats: countersSchema,
  increase: countersSchema,
  sourceUrl: z.string().nullable().optional()
})
export type LossesResponse = z.infer<typeof lossesResponseSchema>

export const lossesHistoryQuerySchema = z.object({
  category: z.enum(LOSS_CATEGORIES).default(DEFAULT_LOSS_CATEGORY)
})
export type LossesHistoryQuery = z.infer<typeof lossesHistoryQuerySchema>

/** `GET /api/losses/history?category=`: one category over time, oldest first. */
export const lossesHistoryResponseSchema = z.object({
  category: z.enum(LOSS_CATEGORIES),
  points: z.array(z.object({ date: z.string(), total: z.number().int(), increase: z.number().int().nullable() }))
})
export type LossesHistoryResponse = z.infer<typeof lossesHistoryResponseSchema>

/** Drops null / non-numeric counters so a stored row only holds numbers. Shared by the API fetcher and the backfill script. */
const cleanCounters = (raw: LossCounters | null | undefined): Record<string, number> =>
  Object.fromEntries(Object.entries(raw ?? {}).filter((e): e is [string, number] => typeof e[1] === 'number'))

/** Upstream record -> `registry.war_losses_daily` row shape (without `fetched_at`). */
export function lossRecordToRow(r: UpstreamLossRecord): {
  day: string
  dayNumber: number | null
  resource: string | null
  stats: Record<string, number>
  increase: Record<string, number>
} {
  return {
    day: r.date,
    dayNumber: r.day ?? null,
    resource: r.resource ?? null,
    stats: cleanCounters(r.stats),
    increase: cleanCounters(r.increase)
  }
}

/** `increase` for one category on one day, or null when upstream gave none. */
export const lossIncrease = (increase: LossCounters | null | undefined, category: LossCategory): number | null =>
  increase?.[category] ?? null
