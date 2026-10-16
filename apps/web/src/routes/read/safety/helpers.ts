import { CRASH_BANDS, crashBand } from '@carplates/shared'
import type { CrashBand, SafetyStatsResponse, SafetyStatsRow } from '@carplates/shared'

import { plausibleYear } from '@/routes/fuel/helpers'

/** Model years drawn on the by-year chart: crash tests are not comparable for much older cars. */
export const FIRST_YEAR = 2000

/** A year needs this many rated cars to be drawn — a handful of rated cars would give a noisy average. */
export const MIN_RATED_PER_YEAR = 1000

/** Share of `part` in `whole` as 0–100 with one decimal (0 when `whole` is 0). */
export function percentOf(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0
}

/** Model years that can be charted, oldest first. */
export function chartYears(rows: readonly SafetyStatsRow[], currentYear: number): SafetyStatsRow[] {
  return rows
    .filter(
      r =>
        plausibleYear(r.label, currentYear) &&
        Number(r.label) >= FIRST_YEAR &&
        r.matched >= MIN_RATED_PER_YEAR &&
        r.avgScore != null
    )
    .sort((a, b) => Number(a.label) - Number(b.label))
}

export type YearTrend = { from: SafetyStatsRow; to: SafetyStatsRow }

/** The oldest and newest charted year, null when fewer than two years can be compared. */
export function yearTrend(years: readonly SafetyStatsRow[]): YearTrend | null {
  const from = years[0]
  const to = years[years.length - 1]
  return from && to && from !== to ? { from, to } : null
}

/** Rated cars per colour band (the same bands as the /safety page); every band is present, possibly 0. */
export function bandShares(
  distribution: SafetyStatsResponse['distribution'],
  bandWidth: number
): Record<CrashBand, number> {
  const out = Object.fromEntries(CRASH_BANDS.map(b => [b, 0])) as Record<CrashBand, number>
  for (const { from, n } of distribution) out[crashBand(from + bandWidth / 2)] += n
  return out
}
