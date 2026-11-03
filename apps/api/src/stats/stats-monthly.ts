import { MONTHLY_GROUPS } from '@carplates/shared'
import type { MonthlyStatsResponse } from '@carplates/shared'

type Row = { month: string; opGroup: string | null; n: number }

/** Months kept: a full year plus the year before it, for the year-on-year line. */
export const MONTHLY_STATS_MONTHS = 24

/** Pivots the (month, group) rollup into one row per month, ascending, keeping the latest `MONTHLY_STATS_MONTHS`. */
export function foldMonthlyStats(rows: readonly Row[]): MonthlyStatsResponse {
  const byMonth = new Map<string, { new: number; import: number; resale: number }>()
  for (const r of rows) {
    const group = MONTHLY_GROUPS.find(g => g === r.opGroup)
    if (!group) continue
    const entry = byMonth.get(r.month) ?? { new: 0, import: 0, resale: 0 }
    entry[group] += r.n
    byMonth.set(r.month, entry)
  }
  const months = [...byMonth.entries()]
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-MONTHLY_STATS_MONTHS)
  return { months }
}
