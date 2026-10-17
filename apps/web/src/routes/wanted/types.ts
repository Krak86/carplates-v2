import type { WantedStatsRow } from '@carplates/shared'

export const WANTED_DIMENSIONS = ['region', 'brand', 'model', 'type', 'color'] as const
export type WantedDimension = (typeof WANTED_DIMENSIONS)[number]

export const WANTED_METRICS = ['stolen', 'found', 'wanted'] as const
export type WantedMetric = (typeof WANTED_METRICS)[number]

export const WANTED_VIEWS = ['table', 'map'] as const
export type WantedView = (typeof WANTED_VIEWS)[number]

// Explicit, not LIST[0]: order is presentation, the default is semantics.
export const DEFAULT_WANTED_DIMENSION: WantedDimension = 'region'
export const DEFAULT_WANTED_METRIC: WantedMetric = 'stolen'
export const DEFAULT_WANTED_VIEW: WantedView = 'table'

export const WANTED_DIMENSION_ICONS: Readonly<Record<WantedDimension, string>> = {
  region: '🗺️',
  brand: '🏭',
  model: '🚗',
  type: '🚚',
  color: '🎨'
}

/** Theft years before this are mostly old feed records whose removals were never tracked: grouped into one bar. */
export const TRACKED_FROM_YEAR = 2020

/** A breakdown row plus its found share (0-100), so the table can sort on it. */
export type WantedTableRow = WantedStatsRow & { foundPercent: number }
