import type { SafetyStatsRow } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import { bandShares, chartYears, percentOf, yearTrend } from '@/routes/read/safety/helpers'

const row = (label: string, matched: number, avgScore: number | null): SafetyStatsRow => ({
  label,
  n: matched * 2,
  matched,
  avgScore
})

describe('percentOf', () => {
  it('rounds to one decimal and survives a zero whole', () => {
    expect(percentOf(1, 3)).toBe(33.3)
    expect(percentOf(5, 0)).toBe(0)
  })
})

describe('chartYears', () => {
  it('keeps real, recent, well-rated years and sorts them oldest first', () => {
    const years = chartYears(
      [
        row('2020', 5000, 80),
        row('1985', 5000, 50),
        row('2010', 10, 60),
        row('2005', 2000, null),
        row('2012', 3000, 70)
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
    const years = [row('2005', 2000, 55), row('2012', 3000, 70), row('2022', 3000, 85)]
    expect(yearTrend(years)?.from.label).toBe('2005')
    expect(yearTrend(years)?.to.label).toBe('2022')
    expect(yearTrend(years.slice(0, 1))).toBeNull()
    expect(yearTrend([])).toBeNull()
  })
})

describe('bandShares', () => {
  it('folds score bands into the four colour bands', () => {
    const shares = bandShares(
      [
        { from: 0, n: 1 },
        { from: 50, n: 2 },
        { from: 70, n: 4 },
        { from: 90, n: 8 }
      ],
      10
    )
    expect(shares).toEqual({ green: 8, yellow: 4, orange: 2, red: 1 })
  })
})
