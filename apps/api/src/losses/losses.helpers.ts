import { lossIncrease } from '@carplates/shared'
import type { LossCategory, LossCounters, LossesHistoryResponse, LossesResponse } from '@carplates/shared'

type StoredDay = {
  day: string
  dayNumber: number | null
  resource: string | null
  stats: LossCounters
  increase: LossCounters
}

/** Only an http(s) link is passed on; anything else upstream put in `resource` is dropped. */
export const safeSourceUrl = (resource: string | null): string | null =>
  resource && /^https?:\/\//i.test(resource) ? resource : null

export function toLossesResponse(row: StoredDay): LossesResponse {
  return {
    date: row.day,
    day: row.dayNumber,
    stats: row.stats,
    increase: row.increase,
    sourceUrl: safeSourceUrl(row.resource)
  }
}

/** Days that have no value for the category are skipped, so the chart never plots a fake zero. */
export function toLossesHistory(category: LossCategory, rows: readonly StoredDay[]): LossesHistoryResponse {
  const points = rows.flatMap(r => {
    const total = r.stats[category]
    return typeof total === 'number' ? [{ date: r.day, total, increase: lossIncrease(r.increase, category) }] : []
  })
  return { category, points }
}
