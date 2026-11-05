import type { AlarmHistoryRegion, RegionFacetStatsResponse } from '@carplates/shared'

/** Fuel classes the scatter can put on its x axis. */
export const FLEET_METRICS = ['electric', 'diesel'] as const
export type FleetMetric = (typeof FLEET_METRICS)[number]
export const DEFAULT_FLEET_METRIC: FleetMetric = 'electric'

export type ScatterPoint = {
  region: string
  /** Share (0..1) of the region's passenger-car fleet with this fuel class. */
  share: number
  /** Hours under alert in the history year (official source). */
  hours: number
  fleet: number
}

/**
 * One point per region that has both numbers: fleet share (own rollup) and hours under alert (official history).
 * Regions missing from either side, or with an empty fleet, are left out rather than drawn at zero.
 */
export function scatterPoints(
  alerts: readonly AlarmHistoryRegion[],
  facets: RegionFacetStatsResponse['regions'],
  metric: FleetMetric
): ScatterPoint[] {
  const byRegion = new Map(facets.map(f => [f.region, f]))
  const points: ScatterPoint[] = []
  for (const a of alerts) {
    const f = byRegion.get(a.region)
    if (!f || f.fleet <= 0) continue
    const n = f.fuels.find(x => x.value === metric)?.n ?? 0
    points.push({ region: a.region, share: n / f.fleet, hours: a.seconds / 3600, fleet: f.fleet })
  }
  return points
}

/** Gridline count for an axis ending at `niceMax`, chosen so every tick is a round number (1 -> 5 x 0.2, 2 -> 4 x 0.5, 5 -> 5 x 1). */
export function tickCount(max: number): number {
  const m = max / 10 ** Math.floor(Math.log10(max))
  return Math.abs(m - 2) < 1e-9 ? 4 : 5
}

/** A "nice" axis maximum at or above `value` (1, 2, 5 x 10^k), so ticks land on round numbers. */
export function niceMax(value: number): number {
  if (!(value > 0)) return 1
  const pow = 10 ** Math.floor(Math.log10(value))
  const m = value / pow
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * pow
}
