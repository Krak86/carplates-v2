import type { MonthlyGroup, MonthlyStatsResponse } from '@carplates/shared'

export const TREND_FILTERS = ['all', 'new', 'import', 'resale'] as const
export type TrendFilter = (typeof TREND_FILTERS)[number]
export const DEFAULT_TREND_FILTER: TrendFilter = 'all'

/** Which vehicles the trend counts: passenger cars only, or every kind (the rollup's totals). */
export const TREND_SCOPES = ['cars', 'all'] as const
export type TrendScope = (typeof TREND_SCOPES)[number]
export const DEFAULT_TREND_SCOPE: TrendScope = 'all'

export const TREND_MONTHS = 12

export type TrendPoint = { month: string; value: number; previous: number | null }

type Month = MonthlyStatsResponse['months'][number]

/** True when the API sent the passenger-car split (an older API or an unbuilt rollup has no `cars`). */
export function hasCarSplit(months: MonthlyStatsResponse['months']): boolean {
  return months.length > 0 && months.every(m => !!m.cars)
}

function valueOf(row: Month, filter: TrendFilter, scope: TrendScope): number {
  const counts = scope === 'cars' ? (row.cars ?? row) : row
  if (filter === 'all') return counts.new + counts.import + counts.resale
  return counts[filter satisfies MonthlyGroup]
}

/** The latest 12 months of `filter` and `scope`, each with the same calendar month a year earlier (null when the data does not go back that far). */
export function trendPoints(
  months: MonthlyStatsResponse['months'],
  filter: TrendFilter,
  scope: TrendScope = DEFAULT_TREND_SCOPE
): TrendPoint[] {
  const values = new Map(months.map(m => [m.month, valueOf(m, filter, scope)]))
  return months.slice(-TREND_MONTHS).map(m => {
    const [year, mm] = m.month.split('-')
    const prev = values.get(`${Number(year) - 1}-${mm}`)
    return { month: m.month, value: valueOf(m, filter, scope), previous: prev ?? null }
  })
}

/** "2026-08" -> "2025-08": the same month a year earlier. */
export function yearEarlier(month: string): string {
  return month.replace(/^\d{4}/, y => String(Number(y) - 1))
}

/** "2026-08" -> "08.26" (compact axis label). */
export function monthAxisLabel(month: string): string {
  const [year, mm] = month.split('-')
  return `${mm}.${(year ?? '').slice(2)}`
}
