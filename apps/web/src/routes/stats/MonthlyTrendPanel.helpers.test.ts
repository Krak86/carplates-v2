import { describe, expect, it } from 'vitest'

import { hasCarSplit, monthAxisLabel, trendPoints, yearEarlier } from './MonthlyTrendPanel.helpers'

const months = Array.from({ length: 24 }, (_, i) => ({
  month: `${2024 + Math.floor((i + 8) / 12)}-${String(((i + 8) % 12) + 1).padStart(2, '0')}`,
  new: i,
  import: 10,
  resale: 100
}))

describe('trendPoints', () => {
  it('returns the latest 12 months with the year-earlier value', () => {
    const pts = trendPoints(months, 'all')
    expect(pts).toHaveLength(12)
    expect(pts[0]?.month).toBe('2025-09')
    expect(pts[0]?.value).toBe(12 + 110)
    expect(pts[0]?.previous).toBe(0 + 110)
  })

  it('filters one group', () => {
    expect(trendPoints(months, 'new').at(-1)).toMatchObject({ value: 23, previous: 11 })
  })

  it('has no previous value without a year of history', () => {
    expect(trendPoints(months.slice(-12), 'all').every(p => p.previous === null)).toBe(true)
  })

  it('counts passenger cars only in the cars scope', () => {
    const withCars = months.map(m => ({ ...m, cars: { new: 1, import: 2, resale: 3 } }))
    expect(trendPoints(withCars, 'all', 'cars').at(-1)).toMatchObject({ value: 6, previous: 6 })
    expect(trendPoints(withCars, 'import', 'cars').at(-1)?.value).toBe(2)
    expect(trendPoints(withCars, 'all', 'all').at(-1)?.value).toBe(23 + 110)
  })

  it('falls back to the totals when the cars split is missing', () => {
    expect(trendPoints(months, 'new', 'cars').at(-1)?.value).toBe(23)
  })
})

describe('hasCarSplit', () => {
  it('needs every month to carry cars', () => {
    expect(hasCarSplit([])).toBe(false)
    expect(hasCarSplit(months)).toBe(false)
    expect(hasCarSplit(months.map(m => ({ ...m, cars: { new: 0, import: 0, resale: 0 } })))).toBe(true)
  })
})

describe('monthAxisLabel / yearEarlier', () => {
  it('formats months', () => {
    expect(monthAxisLabel('2026-08')).toBe('08.26')
  })

  it('steps a month back a year', () => {
    expect(yearEarlier('2026-08')).toBe('2025-08')
  })
})
