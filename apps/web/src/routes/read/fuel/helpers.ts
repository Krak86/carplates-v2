import { CO2_BANDS } from '@carplates/shared'
import type { Co2Band, FuelStatsResponse, FuelStatsRow } from '@carplates/shared'

import { bandForCo2, plausibleYear } from '@/routes/fuel/helpers'

/** Model years drawn on the by-year chart: older cars mostly match only US-spec rows, so their average is unreliable. */
export const FIRST_YEAR = 2000

/** A year needs this many cars with an estimate to be drawn — a handful would give a noisy average. */
export const MIN_ESTIMATED_PER_YEAR = 1000

/** Share of `part` in `whole` as 0–100 (0 when `whole` is 0), for `formatPercent`. */
export function shareOf(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0
}

/** Fuel classes that have cars, biggest first; the unknown bucket always goes last whatever its size. */
export function fuelMix(rows: readonly FuelStatsRow[]): FuelStatsRow[] {
  return rows
    .filter(r => r.n > 0)
    .sort((a, b) => Number(a.label === 'unknown') - Number(b.label === 'unknown') || b.n - a.n)
}

/** Model years that can be charted, oldest first. */
export function chartYears(rows: readonly FuelStatsRow[], currentYear: number): FuelStatsRow[] {
  return rows
    .filter(
      r =>
        plausibleYear(r.label, currentYear) &&
        Number(r.label) >= FIRST_YEAR &&
        r.matched >= MIN_ESTIMATED_PER_YEAR &&
        r.avgCo2 != null
    )
    .sort((a, b) => Number(a.label) - Number(b.label))
}

export type YearTrend = { from: FuelStatsRow; to: FuelStatsRow }

/** The oldest and newest charted year, null when fewer than two years can be compared. */
export function yearTrend(years: readonly FuelStatsRow[]): YearTrend | null {
  const from = years[0]
  const to = years[years.length - 1]
  return from && to && from !== to ? { from, to } : null
}

/** Cars with an estimate per colour band (the same bands as the /fuel page); every band is present, possibly 0. */
export function bandShares(
  distribution: FuelStatsResponse['distribution'],
  bandWidth: number
): Record<Co2Band, number> {
  const out = Object.fromEntries(CO2_BANDS.map(b => [b, 0])) as Record<Co2Band, number>
  for (const { from, n } of distribution) out[bandForCo2(from + bandWidth / 2)] += n
  return out
}
