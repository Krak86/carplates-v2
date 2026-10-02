import { CO2_SCORE_MAX_G_KM, co2Band } from '@carplates/shared'
import type { Co2Band, FuelStatsRow } from '@carplates/shared'

/** Bar length (0–100) for an average CO2, on the same g/km scale as the 0–100 score. */
export function barPercent(avgCo2: number | null): number {
  if (avgCo2 == null) return 0
  return Math.max(0, Math.min(100, (avgCo2 / CO2_SCORE_MAX_G_KM) * 100))
}

export function bandForCo2(avgCo2: number): Co2Band {
  return co2Band(barPercent(avgCo2))
}

/** Share (0–100) of a row's cars that have an emissions estimate. */
export function coveragePercent(row: Pick<FuelStatsRow, 'n' | 'matched'>): number {
  return row.n > 0 ? (row.matched / row.n) * 100 : 0
}

/** Registration years that are real model years — the registry has a few junk values (0, 1900, future years). */
export function plausibleYear(label: string, currentYear: number): boolean {
  const year = Number(label)
  return Number.isInteger(year) && year >= 1960 && year <= currentYear
}
