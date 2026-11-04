import type { AlarmHistoryRegion, RoadSafetyRegionsResponse } from '@carplates/shared'

export const HISTORY_MAP_METRICS = ['hours', 'alerts'] as const
export type HistoryMapMetric = (typeof HISTORY_MAP_METRICS)[number]
export const DEFAULT_HISTORY_MAP_METRIC: HistoryMapMetric = 'hours'

export type HistoryRow = AlarmHistoryRegion & {
  /** Crashes with injured / killed and deaths of the same year (Patrol Police); null = no row for the region that year. */
  crashes: number | null
  deaths: number | null
}

/** Alert rows joined with the DTP rows by region name. `crashes` is undefined when the DTP year did not load at all. */
export function joinHistory(
  alerts: readonly AlarmHistoryRegion[],
  crashes: RoadSafetyRegionsResponse['regions'] | undefined
): HistoryRow[] {
  const byRegion = new Map((crashes ?? []).map(r => [r.region, r]))
  return alerts.map(a => {
    const c = byRegion.get(a.region)
    return { ...a, crashes: c?.crashes ?? null, deaths: c?.deaths ?? null }
  })
}

/** Most time under alert first (a siren is a threat, not a strike: this is never a "most bombed" ranking). */
export const sortByTimeUnderAlert = (rows: readonly HistoryRow[]): HistoryRow[] =>
  rows.toSorted((a, b) => b.seconds - a.seconds || a.region.localeCompare(b.region, 'uk'))

/** Whole hours and the remaining minutes of a duration. */
export function splitDuration(seconds: number): { hours: number; minutes: number } {
  const total = Math.round(seconds / 60)
  return { hours: Math.floor(total / 60), minutes: total % 60 }
}

/** Share (0..1) of alerts whose end time is an estimate; null when there were no alerts. */
export function estimatedShare(regions: readonly AlarmHistoryRegion[]): number | null {
  const alerts = regions.reduce((n, r) => n + r.alerts, 0)
  if (alerts === 0) return null
  return regions.reduce((n, r) => n + r.estimatedAlerts, 0) / alerts
}

/** Map rows (`label` = region name): hours under alert (one decimal) or the number of alerts. */
export function historyMapRows(
  regions: readonly AlarmHistoryRegion[],
  metric: HistoryMapMetric
): { label: string; value: number }[] {
  return regions.map(r => ({
    label: r.region,
    value: metric === 'hours' ? Math.round(r.seconds / 360) / 10 : r.alerts
  }))
}

/** Totals over every region of one source (oblast periods summed: an all-Ukraine alert counts once per oblast). */
export function historyTotals(regions: readonly AlarmHistoryRegion[]): { alerts: number; seconds: number } {
  return regions.reduce((t, r) => ({ alerts: t.alerts + r.alerts, seconds: t.seconds + r.seconds }), {
    alerts: 0,
    seconds: 0
  })
}
