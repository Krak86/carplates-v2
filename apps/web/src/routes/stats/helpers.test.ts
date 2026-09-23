import { describe, expect, it } from 'vitest'
import type { StatsResponse } from '@carplates/shared'

import { dimensionHasYearColumn, dimensionRows } from './helpers'

const stats: StatsResponse = {
  summary: { totalRows: 100, distinctPlates: 80, distinctVins: 60, plateless: 5 },
  byYear: [
    { year: 2025, totalRows: 40, distinctPlates: 35, distinctVins: 30 },
    { year: null, totalRows: 5, distinctPlates: 5, distinctVins: 4 }
  ],
  byRegion: [{ region: 'Київ', totalRows: 20, distinctPlates: 18, distinctVins: 15 }],
  byRegionYear: [{ region: 'Київ', year: 2025, totalRows: 10, distinctPlates: 9, distinctVins: 8 }],
  byBody: [{ value: null, totalRows: 2, distinctPlates: 2, distinctVins: 1 }],
  byKind: [{ value: 'Легковий', totalRows: 3, distinctPlates: 3, distinctVins: 2 }],
  byColor: [{ value: 'Білий', totalRows: 4, distinctPlates: 4, distinctVins: 3 }]
}

describe('dimensionRows', () => {
  it('labels the year rollup by year, with a dash for the undated bucket', () => {
    expect(dimensionRows(stats, 'year')).toEqual([
      { year: 2025, totalRows: 40, distinctPlates: 35, distinctVins: 30, label: '2025' },
      { year: null, totalRows: 5, distinctPlates: 5, distinctVins: 4, label: '—' }
    ])
  })

  it('labels the region rollup by region name, with no year', () => {
    expect(dimensionRows(stats, 'region')).toEqual([
      { region: 'Київ', totalRows: 20, distinctPlates: 18, distinctVins: 15, label: 'Київ', year: null }
    ])
  })

  it('keeps a separate year alongside the region label for the 2D rollup', () => {
    expect(dimensionRows(stats, 'regionYear')).toEqual([
      { region: 'Київ', year: 2025, totalRows: 10, distinctPlates: 9, distinctVins: 8, label: 'Київ' }
    ])
  })

  it('falls back to a dash for an unset dimension value (body/kind/color)', () => {
    expect(dimensionRows(stats, 'body')).toEqual([
      { value: null, totalRows: 2, distinctPlates: 2, distinctVins: 1, label: '—', year: null }
    ])
    expect(dimensionRows(stats, 'kind')[0]?.label).toBe('Легковий')
    expect(dimensionRows(stats, 'color')[0]?.label).toBe('Білий')
  })
})

describe('dimensionHasYearColumn', () => {
  it('is true only for the region x year rollup', () => {
    expect(dimensionHasYearColumn('regionYear')).toBe(true)
    expect(dimensionHasYearColumn('region')).toBe(false)
    expect(dimensionHasYearColumn('year')).toBe(false)
  })
})
