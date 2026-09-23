export const STATS_DIMENSIONS = ['region', 'regionYear', 'year', 'body', 'kind', 'color'] as const
export type StatsDimension = (typeof STATS_DIMENSIONS)[number]

export const STATS_METRICS = ['distinctPlates', 'distinctVins', 'totalRows'] as const
export type StatsMetric = (typeof STATS_METRICS)[number]

// Explicit, not STATS_DIMENSIONS[0] / STATS_METRICS[0] — order here is
// presentation (tab order), the default is a separate, semantic choice.
export const DEFAULT_STATS_DIMENSION: StatsDimension = 'region'
export const DEFAULT_STATS_METRIC: StatsMetric = 'distinctPlates'

/** One flattened row the table renders, regardless of which rollup it came from. */
export type StatsRow = {
  label: string
  year: number | null
  totalRows: number
  distinctPlates: number
  distinctVins: number
}
