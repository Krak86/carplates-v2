/** Flags shown inline before collapsing the rest into "+N". */
export const MAX_FLAGS = 6

/** Decile 1 = most popular tenth of models; the label spans its percentile band ("top 10%", "top 10–20%"). */
export function decileBand(decile: number): string {
  return decile <= 1 ? '10' : `${(decile - 1) * 10}–${decile * 10}`
}

/** "Rare elsewhere" — ranked in the least popular third of the markets that list it. */
export const RARE_DECILE = 8

export function isRareElsewhere(decile: number | null, uaOnly: boolean): boolean {
  return !uaOnly && decile != null && decile >= RARE_DECILE
}

/** The 15 official registers VehiclesDB is built from (ISO 3166-1 alpha-2, lowercase). */
export const COVERED_MARKETS = [
  'ar',
  'ca',
  'de',
  'es',
  'fi',
  'gb',
  'ie',
  'lu',
  'my',
  'nl',
  'no',
  'nz',
  'th',
  'ua',
  'us'
] as const
