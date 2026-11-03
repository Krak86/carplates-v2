import type { MonthlyGroup, MonthlyStatsResponse } from '@carplates/shared'

export const TREND_FILTERS = ['all', 'new', 'import', 'resale'] as const
export type TrendFilter = (typeof TREND_FILTERS)[number]
export const DEFAULT_TREND_FILTER: TrendFilter = 'all'

export const TREND_MONTHS = 12

export type TrendPoint = { month: string; value: number; previous: number | null }

function valueOf(row: MonthlyStatsResponse['months'][number], filter: TrendFilter): number {
  if (filter === 'all') return row.new + row.import + row.resale
  return row[filter satisfies MonthlyGroup]
}

/** The latest 12 months of `filter`, each with the same calendar month a year earlier (null when the data does not go back that far). */
export function trendPoints(months: MonthlyStatsResponse['months'], filter: TrendFilter): TrendPoint[] {
  const values = new Map(months.map(m => [m.month, valueOf(m, filter)]))
  return months.slice(-TREND_MONTHS).map(m => {
    const [year, mm] = m.month.split('-')
    const prev = values.get(`${Number(year) - 1}-${mm}`)
    return { month: m.month, value: valueOf(m, filter), previous: prev ?? null }
  })
}

/** A round upper bound for the axis (1, 2, 2.5, 5 x 10^n) and its ticks (0, half, max). */
export function niceMax(max: number): number {
  if (max <= 0) return 1
  const pow = 10 ** Math.floor(Math.log10(max))
  const step = [1, 2, 2.5, 5, 10].find(s => s * pow >= max) ?? 10
  return step * pow
}

/** "2026-08" -> "08.26" (compact axis label). */
export function monthAxisLabel(month: string): string {
  const [year, mm] = month.split('-')
  return `${mm}.${(year ?? '').slice(2)}`
}
