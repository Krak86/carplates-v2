import { ALARM_HISTORY_SOURCES } from '@carplates/shared'
import type { AlarmHistoryResponse } from '@carplates/shared'

export type HistoryRow = {
  region: string
  source: string
  alerts: number
  seconds: number
  longestSeconds: number
  estimatedAlerts: number
  firstDay: string
  lastDay: string
}

/** Years newest first; the asked year must exist, no year = the newest. Null when there is no data or the year is unknown. */
export function pickHistoryYear(years: readonly number[], year?: number): number | null {
  const sorted = [...new Set(years)].sort((a, b) => b - a)
  if (year === undefined) return sorted[0] ?? null
  return sorted.includes(year) ? year : null
}

/** Groups the per-region rows by source (never merged); regions sorted by name, sources in `ALARM_HISTORY_SOURCES` order. */
export function buildHistory(
  year: number,
  years: readonly number[],
  rows: readonly HistoryRow[]
): AlarmHistoryResponse {
  const sources = ALARM_HISTORY_SOURCES.flatMap(source => {
    const own = rows.filter(r => r.source === source)
    if (own.length === 0) return []
    return [
      {
        source,
        firstDay: own.map(r => r.firstDay).reduce((a, b) => (b < a ? b : a)),
        lastDay: own.map(r => r.lastDay).reduce((a, b) => (b > a ? b : a)),
        regions: own
          .map(({ region, alerts, seconds, longestSeconds, estimatedAlerts }) => ({
            region,
            alerts,
            seconds,
            longestSeconds,
            estimatedAlerts
          }))
          .sort((a, b) => a.region.localeCompare(b.region, 'uk'))
      }
    ]
  })
  return { year, years: [...new Set(years)].sort((a, b) => b - a), sources }
}
