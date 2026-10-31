import type { SafetyStatsRow } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import {
  bandShares,
  changePercent,
  chartYears,
  crashShare,
  deathsPer100Crashes,
  lastTwoFullYears,
  percentOf,
  yearTrend
} from '@/routes/read/safety/helpers'
import type { YearTotals } from '@/routes/read/safety/helpers'

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

describe('road context helpers', () => {
  const totals = (year: number, deaths: number, partial = false): YearTotals => ({
    year,
    partial,
    crashes: deaths * 10,
    deaths,
    injured: 0
  })

  it('changePercent rounds and refuses a zero base', () => {
    expect(changePercent(200, 150)).toBe(-25)
    expect(changePercent(0, 5)).toBeNull()
  })

  it('lastTwoFullYears skips a partial year', () => {
    const rows = [totals(2025, 100), totals(2023, 120), totals(2024, 110), totals(2026, 40, true)]
    expect(lastTwoFullYears(rows)).toMatchObject({ previous: { year: 2024 }, latest: { year: 2025 } })
    expect(lastTwoFullYears([totals(2025, 100)])).toBeNull()
  })

  it('deathsPer100Crashes', () => {
    expect(deathsPer100Crashes({ crashes: 400, deaths: 30 })).toBe(7.5)
    expect(deathsPer100Crashes({ crashes: 0, deaths: 0 })).toBeNull()
  })

  it('crashShare ignores regions without the figure and returns null when none has it', () => {
    const regions = [
      { crashes: 100, pedestrianCrashes: 25 },
      { crashes: 100, pedestrianCrashes: null },
      { crashes: 100 }
    ]
    expect(crashShare(regions, 'pedestrianCrashes')).toBe(25)
    expect(crashShare(regions, 'childCrashes')).toBeNull()
  })
})
