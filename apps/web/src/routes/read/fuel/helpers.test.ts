import type { FuelStatsRow } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import { bandShares, chartYears, fuelMix, shareOf, yearTrend } from '@/routes/read/fuel/helpers'

const row = (label: string, matched: number, avgCo2: number | null, n = matched * 2): FuelStatsRow => ({
  label,
  n,
  matched,
  avgCo2
})

describe('shareOf', () => {
  it('is a 0–100 share and survives a zero whole', () => {
    expect(shareOf(1, 4)).toBe(25)
    expect(shareOf(5, 0)).toBe(0)
  })
})

describe('fuelMix', () => {
  it('sorts by size, puts unknown last and drops empty classes', () => {
    const mix = fuelMix([
      row('unknown', 0, null, 900),
      row('diesel', 10, 150, 300),
      row('petrol', 10, 160, 500),
      row('hydrogen', 0, null, 0)
    ])
    expect(mix.map(r => r.label)).toEqual(['petrol', 'diesel', 'unknown'])
  })
})

describe('chartYears', () => {
  it('keeps real, recent, well-covered years and sorts them oldest first', () => {
    const years = chartYears(
      [
        row('2020', 5000, 120),
        row('1985', 5000, 200),
        row('2010', 10, 160),
        row('2005', 2000, null),
        row('2012', 3000, 150)
      ],
      2026
    )
    expect(years.map(y => y.label)).toEqual(['2012', '2020'])
  })

  it('drops future years', () => {
    expect(chartYears([row('2031', 5000, 90)], 2026)).toEqual([])
  })
})

describe('yearTrend', () => {
  it('compares the oldest and newest year, and needs two', () => {
    const years = [row('2005', 2000, 190), row('2012', 3000, 160), row('2022', 3000, 120)]
    expect(yearTrend(years)?.from.label).toBe('2005')
    expect(yearTrend(years)?.to.label).toBe('2022')
    expect(yearTrend(years.slice(0, 1))).toBeNull()
    expect(yearTrend([])).toBeNull()
  })
})

describe('bandShares', () => {
  it('folds g/km bands into the four colour bands (green < 75, yellow < 150, orange < 225)', () => {
    const shares = bandShares(
      [
        { from: 0, n: 1 },
        { from: 100, n: 2 },
        { from: 200, n: 4 },
        { from: 250, n: 8 }
      ],
      25
    )
    expect(shares).toEqual({ green: 1, yellow: 2, orange: 4, red: 8 })
  })
})
