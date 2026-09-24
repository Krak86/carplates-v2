export const STATS_DIMENSIONS = [
  'region',
  'regionYear',
  'year',
  'body',
  'kind',
  'color',
  'fuel',
  'brand',
  'brandYear'
] as const
export type StatsDimension = (typeof STATS_DIMENSIONS)[number]

export const STATS_METRICS = ['distinctPlates', 'distinctVins', 'totalRows'] as const
export type StatsMetric = (typeof STATS_METRICS)[number]

export const STATS_VIEWS = ['table', 'map'] as const
export type StatsView = (typeof STATS_VIEWS)[number]

// Explicit, not STATS_DIMENSIONS[0] / STATS_METRICS[0] — order here is
// presentation (tab order), the default is a separate, semantic choice.
export const DEFAULT_STATS_DIMENSION: StatsDimension = 'region'
export const DEFAULT_STATS_METRIC: StatsMetric = 'distinctPlates'
export const DEFAULT_STATS_VIEW: StatsView = 'table'

// Decorative only (aria-hidden in the UI) — same plain-emoji convention as
// the rest of the app (SearchRoute's 🕘/📊 links), not an icon library.
export const DIMENSION_ICONS: Readonly<Record<StatsDimension, string>> = {
  region: '🗺️',
  regionYear: '🧭',
  year: '📅',
  body: '🚙',
  kind: '🚚',
  color: '🎨',
  fuel: '⛽',
  brand: '🏭',
  brandYear: '🏭📅'
}

export const METRIC_ICONS: Readonly<Record<StatsMetric, string>> = {
  distinctPlates: '🏷️',
  distinctVins: '🆔',
  totalRows: '📋'
}

/** One flattened row the table renders, regardless of which rollup it came from. */
export type StatsRow = {
  label: string
  year: number | null
  totalRows: number
  distinctPlates: number
  distinctVins: number
}
