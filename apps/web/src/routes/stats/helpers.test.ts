import { describe, expect, it } from 'vitest'
import type { StatsResponse } from '@carplates/shared'

import {
  choroplethColor,
  dimensionHasYearColumn,
  dimensionRows,
  MAX_TOP_N,
  rankOf,
  rankOfModel,
  topBrands,
  topColors,
  topModels,
  topRegions,
  yearBoundaryLabel,
  yearRange
} from './helpers'

const stats: StatsResponse = {
  summary: { totalRows: 100, distinctPlates: 80, distinctVins: 60, plateless: 5 },
  byYear: [
    { year: 2025, totalRows: 40, distinctPlates: 35, distinctVins: 30 },
    { year: null, totalRows: 5, distinctPlates: 5, distinctVins: 4 }
  ],
  byRegion: [
    { region: 'Київ', totalRows: 20, distinctPlates: 18, distinctVins: 15 },
    { region: 'Львівська область', totalRows: 12, distinctPlates: 10, distinctVins: 9 }
  ],
  byRegionYear: [{ region: 'Київ', year: 2025, totalRows: 10, distinctPlates: 9, distinctVins: 8 }],
  byBody: [{ value: null, totalRows: 2, distinctPlates: 2, distinctVins: 1 }],
  byKind: [{ value: 'Легковий', totalRows: 3, distinctPlates: 3, distinctVins: 2 }],
  byColor: [
    { value: 'Білий', totalRows: 4, distinctPlates: 4, distinctVins: 3 },
    { value: 'Чорний', totalRows: 9, distinctPlates: 9, distinctVins: 7 },
    { value: null, totalRows: 1, distinctPlates: 1, distinctVins: 1 }
  ],
  byFuel: [
    { value: 'БЕНЗИН', totalRows: 6, distinctPlates: 6, distinctVins: 5 },
    { value: null, totalRows: 2, distinctPlates: 2, distinctVins: 2 },
    { value: 'NULL', totalRows: 1, distinctPlates: 1, distinctVins: 1 }
  ],
  byBrand: [
    { value: 'LEXUS', totalRows: 7, distinctPlates: 7, distinctVins: 6 },
    { value: 'TOYOTA', totalRows: 15, distinctPlates: 14, distinctVins: 12 }
  ],
  byBrandYear: [{ brand: 'LEXUS', year: 2025, totalRows: 3, distinctPlates: 3, distinctVins: 3 }],
  byOrigin: [
    { value: 'Ввезено з-за кордону, дилер', totalRows: 5, distinctPlates: 5, distinctVins: 4 },
    { value: null, totalRows: 10, distinctPlates: 10, distinctVins: 8 }
  ],
  topModels: [
    { brand: 'TOYOTA', model: 'CAMRY', totalRows: 5, distinctPlates: 5, distinctVins: 4 },
    { brand: 'LEXUS', model: 'RX', totalRows: 2, distinctPlates: 2, distinctVins: 2 }
  ]
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
      { region: 'Київ', totalRows: 20, distinctPlates: 18, distinctVins: 15, label: 'Київ', year: null },
      {
        region: 'Львівська область',
        totalRows: 12,
        distinctPlates: 10,
        distinctVins: 9,
        label: 'Львівська область',
        year: null
      }
    ])
  })

  it('keeps a separate year alongside the region label for the 2D rollup', () => {
    expect(dimensionRows(stats, 'regionYear')).toEqual([
      { region: 'Київ', year: 2025, totalRows: 10, distinctPlates: 9, distinctVins: 8, label: 'Київ' }
    ])
  })

  it('falls back to a dash for an unset dimension value (body/kind/color/fuel)', () => {
    expect(dimensionRows(stats, 'body')).toEqual([
      { value: null, totalRows: 2, distinctPlates: 2, distinctVins: 1, label: '—', year: null }
    ])
    expect(dimensionRows(stats, 'kind')[0]?.label).toBe('Легковий')
    expect(dimensionRows(stats, 'color')[0]?.label).toBe('Білий')
    expect(dimensionRows(stats, 'fuel')[0]?.label).toBe('БЕНЗИН')
  })

  it('labels the brand rollup by brand name, with no year', () => {
    expect(dimensionRows(stats, 'brand')).toEqual([
      { value: 'LEXUS', totalRows: 7, distinctPlates: 7, distinctVins: 6, label: 'LEXUS', year: null },
      { value: 'TOYOTA', totalRows: 15, distinctPlates: 14, distinctVins: 12, label: 'TOYOTA', year: null }
    ])
  })

  it('keeps a separate year alongside the brand label for the 2D rollup', () => {
    expect(dimensionRows(stats, 'brandYear')).toEqual([
      { brand: 'LEXUS', year: 2025, totalRows: 3, distinctPlates: 3, distinctVins: 3, label: 'LEXUS' }
    ])
  })

  it('falls back to a dash for the unclassified (null) origin bucket', () => {
    expect(dimensionRows(stats, 'origin')).toEqual([
      {
        value: 'Ввезено з-за кордону, дилер',
        totalRows: 5,
        distinctPlates: 5,
        distinctVins: 4,
        label: 'Ввезено з-за кордону, дилер',
        year: null
      },
      { value: null, totalRows: 10, distinctPlates: 10, distinctVins: 8, label: '—', year: null }
    ])
  })

  it('merges the unknown/absent fuel values into one dash row', () => {
    expect(dimensionRows(stats, 'fuel')).toEqual([
      { value: 'БЕНЗИН', totalRows: 6, distinctPlates: 6, distinctVins: 5, label: 'БЕНЗИН', year: null },
      { label: '—', year: null, totalRows: 3, distinctPlates: 3, distinctVins: 3 }
    ])
  })
})

describe('dimensionHasYearColumn', () => {
  it('is true only for the 2D rollups (region x year, brand x year)', () => {
    expect(dimensionHasYearColumn('regionYear')).toBe(true)
    expect(dimensionHasYearColumn('brandYear')).toBe(true)
    expect(dimensionHasYearColumn('region')).toBe(false)
    expect(dimensionHasYearColumn('brand')).toBe(false)
    expect(dimensionHasYearColumn('year')).toBe(false)
    expect(dimensionHasYearColumn('origin')).toBe(false)
  })
})

describe('yearRange', () => {
  it('returns the min/max of the dated years, ignoring the undated bucket', () => {
    expect(yearRange(stats)).toEqual({ min: 2025, max: 2025 })
  })

  it('spans multiple years out of order', () => {
    const multiYear: StatsResponse = {
      ...stats,
      byYear: [
        { year: 2019, totalRows: 1, distinctPlates: 1, distinctVins: 1 },
        { year: null, totalRows: 1, distinctPlates: 1, distinctVins: 1 },
        { year: 2013, totalRows: 1, distinctPlates: 1, distinctVins: 1 },
        { year: 2026, totalRows: 1, distinctPlates: 1, distinctVins: 1 }
      ]
    }
    expect(yearRange(multiYear)).toEqual({ min: 2013, max: 2026 })
  })

  it('returns null when there are no dated years', () => {
    const noYears: StatsResponse = {
      ...stats,
      byYear: [{ year: null, totalRows: 1, distinctPlates: 1, distinctVins: 1 }]
    }
    expect(yearRange(noYears)).toBeNull()
  })
})

describe('yearBoundaryLabel', () => {
  const now = new Date(2026, 8, 23) // 2026-09-23, month is 0-indexed

  it('is just the year when it is not the current calendar year', () => {
    expect(yearBoundaryLabel(2013, 'en-US', now)).toBe('2013')
    expect(yearBoundaryLabel(2025, 'en-US', now)).toBe('2025')
  })

  it('appends the current month when the year is the current calendar year', () => {
    expect(yearBoundaryLabel(2026, 'en-US', now)).toBe('September 2026')
    expect(yearBoundaryLabel(2026, 'uk-UA', now)).toBe('вересень 2026 р.')
  })
})

describe('topBrands / topColors / topRegions / topModels', () => {
  it('ranks by distinctPlates, highest first, dropping null values', () => {
    expect(topBrands(stats)).toEqual(['TOYOTA', 'LEXUS'])
    expect(topColors(stats)).toEqual(['Чорний', 'Білий'])
    expect(topRegions(stats)).toEqual(['Київ', 'Львівська область'])
    expect(topModels(stats)).toEqual([
      { brand: 'TOYOTA', model: 'CAMRY', totalRows: 5, distinctPlates: 5, distinctVins: 4 },
      { brand: 'LEXUS', model: 'RX', totalRows: 2, distinctPlates: 2, distinctVins: 2 }
    ])
  })

  it('caps at n', () => {
    expect(topBrands(stats, 1)).toEqual(['TOYOTA'])
  })

  it('defaults to the top 10 — the API/panel "show 10" ceiling, not just the panel default 5-row display', () => {
    expect(MAX_TOP_N).toBe(10)
  })
})

describe('rankOf / rankOfModel', () => {
  it('returns the 1-based rank when present', () => {
    expect(rankOf(topBrands(stats), 'LEXUS')).toBe(2)
    expect(rankOf(topBrands(stats), 'TOYOTA')).toBe(1)
  })

  it('returns null when absent or the value is null', () => {
    expect(rankOf(topBrands(stats), 'BMW')).toBeNull()
    expect(rankOf(topBrands(stats), null)).toBeNull()
  })

  it('matches a brand+model pair by both fields', () => {
    expect(rankOfModel(topModels(stats), 'LEXUS', 'RX')).toBe(2)
    expect(rankOfModel(topModels(stats), 'LEXUS', 'CAMRY')).toBeNull()
    expect(rankOfModel(topModels(stats), null, 'RX')).toBeNull()
  })
})

describe('choroplethColor', () => {
  it('anchors light mode light-to-dark and dark mode dark-to-light', () => {
    expect(choroplethColor(0, 'light')).toBe('rgb(205, 226, 251)')
    expect(choroplethColor(1, 'light')).toBe('rgb(13, 54, 107)')
    expect(choroplethColor(0, 'dark')).toBe('rgb(13, 54, 107)')
    expect(choroplethColor(1, 'dark')).toBe('rgb(205, 226, 251)')
  })

  it('clamps out-of-range t', () => {
    expect(choroplethColor(-1, 'light')).toBe(choroplethColor(0, 'light'))
    expect(choroplethColor(2, 'light')).toBe(choroplethColor(1, 'light'))
  })

  it('is monotonically non-decreasing in lightness as t rises (light mode)', () => {
    const luminance = (rgb: string): number => {
      const [r, g, b] = rgb.match(/\d+/g)!.map(Number)
      return 0.299 * r! + 0.587 * g! + 0.114 * b!
    }
    const samples = [0, 0.25, 0.5, 0.75, 1].map(t => luminance(choroplethColor(t, 'light')))
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThanOrEqual(samples[i - 1]!)
    }
  })
})
