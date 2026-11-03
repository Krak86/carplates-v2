import { MONTHLY_GROUPS } from '@carplates/shared'
import type { MonthlyStatsResponse } from '@carplates/shared'

type Row = { month: string; opGroup: string | null; isCar: boolean; n: number }
type Counts = { new: number; import: number; resale: number }

/** Months kept: a full year plus the year before it, for the year-on-year line. */
export const MONTHLY_STATS_MONTHS = 24

/**
 * Pivots the (month, group, is_car) rollup into one row per month, ascending, keeping the latest `MONTHLY_STATS_MONTHS`.
 * `new` / `import` / `resale` add up every kind; `cars` is the passenger-car share of the same counts.
 */
export function foldMonthlyStats(rows: readonly Row[]): MonthlyStatsResponse {
  const byMonth = new Map<string, { all: Counts; cars: Counts }>()
  for (const r of rows) {
    const group = MONTHLY_GROUPS.find(g => g === r.opGroup)
    if (!group) continue
    const entry = byMonth.get(r.month) ?? {
      all: { new: 0, import: 0, resale: 0 },
      cars: { new: 0, import: 0, resale: 0 }
    }
    entry.all[group] += r.n
    if (r.isCar) entry.cars[group] += r.n
    byMonth.set(r.month, entry)
  }
  const months = [...byMonth.entries()]
    .map(([month, v]) => ({ month, ...v.all, cars: v.cars }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-MONTHLY_STATS_MONTHS)
  return { months }
}
