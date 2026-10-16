import type { EvStatsResponse } from '@carplates/shared'

/** Model years before this are a handful of conversions, not a market. */
export const FIRST_YEAR = 2010
export const TOP_REGIONS = 10

export type EvYear = { year: number; bev: number; hybrid: number; fleet: number }

/** Model years from `FIRST_YEAR` that have any electrified car, oldest first. */
export function evYears(byYear: EvStatsResponse['byYear']): EvYear[] {
  return byYear.filter(y => y.year >= FIRST_YEAR && y.bev + y.hybrid > 0)
}

/** Electric-only share of a model year's passenger cars, 0–100 with one decimal (0 when the year has none). */
export function bevShare(year: Pick<EvYear, 'bev' | 'fleet'>): number {
  return year.fleet > 0 ? Math.round((year.bev / year.fleet) * 1000) / 10 : 0
}

/** The regions with the most electrified cars, biggest first. */
export function topRegions(byRegion: EvStatsResponse['byRegion']): EvStatsResponse['byRegion'] {
  return [...byRegion].sort((a, b) => b.bev + b.hybrid - (a.bev + a.hybrid)).slice(0, TOP_REGIONS)
}

/** The model year with the most electric-only cars, null when there are none. */
export function peakYear(years: readonly EvYear[]): EvYear | null {
  return years.reduce<EvYear | null>((best, y) => (y.bev > (best?.bev ?? 0) ? y : best), null)
}
