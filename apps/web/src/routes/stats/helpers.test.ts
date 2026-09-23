import { describe, expect, it } from 'vitest'
import type { StatsResponse } from '@carplates/shared'

import { choroplethColor, dimensionHasYearColumn, dimensionRows, yearBoundaryLabel, yearRange } from './helpers'

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
  byColor: [{ value: 'Білий', totalRows: 4, distinctPlates: 4, distinctVins: 3 }],
  byFuel: [
    { value: 'БЕНЗИН', totalRows: 6, distinctPlates: 6, distinctVins: 5 },
    { value: null, totalRows: 2, distinctPlates: 2, distinctVins: 2 },
    { value: 'NULL', totalRows: 1, distinctPlates: 1, distinctVins: 1 }
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
      { region: 'Київ', totalRows: 20, distinctPlates: 18, distinctVins: 15, label: 'Київ', year: null }
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

  it('merges the unknown/absent fuel values into one dash row', () => {
    expect(dimensionRows(stats, 'fuel')).toEqual([
      { value: 'БЕНЗИН', totalRows: 6, distinctPlates: 6, distinctVins: 5, label: 'БЕНЗИН', year: null },
      { label: '—', year: null, totalRows: 3, distinctPlates: 3, distinctVins: 3 }
    ])
  })
})

describe('dimensionHasYearColumn', () => {
  it('is true only for the region x year rollup', () => {
    expect(dimensionHasYearColumn('regionYear')).toBe(true)
    expect(dimensionHasYearColumn('region')).toBe(false)
    expect(dimensionHasYearColumn('year')).toBe(false)
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
    const noYears: StatsResponse = { ...stats, byYear: [{ year: null, totalRows: 1, distinctPlates: 1, distinctVins: 1 }] }
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
