import type { StatsResponse } from '@carplates/shared'

import type { StatsDimension, StatsRow } from './types'

/** Flattens whichever rollup `dim` selects into the one row shape the table renders. */
export function dimensionRows(stats: StatsResponse, dim: StatsDimension): StatsRow[] {
  switch (dim) {
    case 'year':
      return stats.byYear.map(r => ({ ...r, label: r.year === null ? '—' : String(r.year), year: r.year }))
    case 'region':
      return stats.byRegion.map(r => ({ ...r, label: r.region, year: null }))
    case 'regionYear':
      return stats.byRegionYear.map(r => ({ ...r, label: r.region, year: r.year }))
    case 'body':
      return stats.byBody.map(r => ({ ...r, label: r.value ?? '—', year: null }))
    case 'kind':
      return stats.byKind.map(r => ({ ...r, label: r.value ?? '—', year: null }))
    case 'color':
      return stats.byColor.map(r => ({ ...r, label: r.value ?? '—', year: null }))
  }
}

/** Whether the flattened table for `dim` needs a separate, sortable Year column. */
export function dimensionHasYearColumn(dim: StatsDimension): boolean {
  return dim === 'regionYear'
}
