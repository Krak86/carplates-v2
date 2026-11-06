import type { DreamSummaryResponse } from '@carplates/shared'

type RegionRow = DreamSummaryResponse['regions'][number]

/** What a marker's size shows: number of projects or committed funding. */
export const RECOVERY_METRICS = ['projects', 'funds'] as const
export type RecoveryMetric = (typeof RECOVERY_METRICS)[number]
export const DEFAULT_RECOVERY_METRIC: RecoveryMetric = 'projects'

/** Marker radius in map units (before zoom). Area grows with the value (radius ~ sqrt), so a double value looks double. */
const R_MIN = 3
const R_MAX = 16

export const metricValue = (row: RegionRow, metric: RecoveryMetric): number =>
  metric === 'funds' ? row.committedUah : row.projects

export type RecoveryMarker = { region: string; x: number; y: number; r: number; row: RegionRow }

/** One marker per region that has a projected centre and a positive value; biggest first so small markers stay on top and clickable. */
export function recoveryMarkers(
  rows: readonly RegionRow[],
  centers: ReadonlyMap<string, readonly [number, number]>,
  metric: RecoveryMetric
): RecoveryMarker[] {
  const max = Math.max(0, ...rows.map(r => metricValue(r, metric)))
  if (max <= 0) return []
  const markers: RecoveryMarker[] = []
  for (const row of rows) {
    const value = metricValue(row, metric)
    const center = centers.get(row.region)
    if (value <= 0 || !center) continue
    markers.push({
      region: row.region,
      x: center[0],
      y: center[1],
      r: R_MIN + (R_MAX - R_MIN) * Math.sqrt(value / max),
      row
    })
  }
  return markers.sort((a, b) => b.r - a.r)
}

/** Share of `part` in `whole` as a whole percent, or null when `whole` is empty. */
export const sharePercent = (part: number, whole: number): number | null =>
  whole > 0 ? Math.round((part / whole) * 100) : null
