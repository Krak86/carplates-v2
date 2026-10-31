import type { WantedStatsResponse, WantedStatsRow } from '@carplates/shared'

import { displayBrand } from '@/lib/display-brand'
import { localizeRegion } from '@/lib/region-label'
import { TRACKED_FROM_YEAR } from '@/routes/wanted/types'
import type { WantedDimension, WantedMetric, WantedPlateDimension, WantedTableRow } from '@/routes/wanted/types'

/** Found share of all records, 0-100 (0 for an empty row). */
export function foundPercent(row: Pick<WantedStatsRow, 'stolen' | 'found'>): number {
  return row.stolen > 0 ? (row.found / row.stolen) * 100 : 0
}

export function withFoundPercent(rows: WantedStatsRow[]): WantedTableRow[] {
  return rows.map(r => ({ ...r, foundPercent: foundPercent(r) }))
}

/** Rows of one dimension tab (the API already sends them top-100, stolen desc). */
export function dimensionRows(stats: WantedStatsResponse, dim: WantedDimension): WantedStatsRow[] {
  switch (dim) {
    case 'region':
      return stats.byRegion
    case 'brand':
      return stats.byBrand
    case 'model':
      return stats.byModel
    case 'type':
      return stats.byType
    case 'color':
      return stats.byColor
  }
}

/** Rows of one Garpun tab; empty when the API sent no plates block (an older API). */
export function plateDimensionRows(stats: WantedStatsResponse, dim: WantedPlateDimension): WantedStatsRow[] {
  return (dim === 'region' ? stats.plates?.byRegion : stats.plates?.byUnit) ?? []
}

/** Per-year bars: every year before `TRACKED_FROM_YEAR` is summed into one leading row labelled by `earlierLabel`. */
export function groupYears(rows: WantedStatsRow[], earlierLabel: string): WantedStatsRow[] {
  const earlier: WantedStatsRow = { label: earlierLabel, stolen: 0, found: 0, wanted: 0 }
  const recent: WantedStatsRow[] = []
  for (const row of rows) {
    const year = Number(row.label)
    if (Number.isFinite(year) && year < TRACKED_FROM_YEAR) {
      earlier.stolen += row.stolen
      earlier.found += row.found
      earlier.wanted += row.wanted
    } else {
      recent.push(row)
    }
  }
  return earlier.stolen > 0 ? [earlier, ...recent] : recent
}

/** Rows for the region map: only labels the map knows, one metric each. */
export function mapRows(rows: WantedStatsRow[], metric: WantedMetric): { label: string; value: number }[] {
  return rows.map(r => ({ label: r.label, value: r[metric] }))
}

/** "БІЛИЙ" → "Білий"; short acronyms (ВАЗ, ЗАЗ) stay upper-case. */
function sentenceCase(text: string): string {
  const lower = text.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/** A label for display: regions localized, brands title-cased, others sentence-cased. The raw label stays the key. */
export function displayLabel(dim: WantedDimension | WantedPlateDimension, label: string, lang: string): string {
  switch (dim) {
    case 'region':
      return localizeRegion(label, lang)
    case 'brand':
      return displayBrand(label)
    case 'unit':
      return label
    case 'model':
    case 'type':
    case 'color':
      return label.length <= 3 ? label : sentenceCase(label)
  }
}

/** `YYYY-MM-DD` of an ISO timestamp or date string; null when empty. */
export function dayOf(value: string | null): string | null {
  return value ? value.slice(0, 10) : null
}
