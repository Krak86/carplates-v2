import { describe, expect, it } from 'vitest'

import { monthAxisLabel, niceMax, trendPoints } from './MonthlyTrendPanel.helpers'

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
})

describe('niceMax / monthAxisLabel', () => {
  it('rounds the axis up', () => {
    expect(niceMax(0)).toBe(1)
    expect(niceMax(204573)).toBe(250000)
    expect(niceMax(100000)).toBe(100000)
  })

  it('formats months', () => {
    expect(monthAxisLabel('2026-08')).toBe('08.26')
  })
})
