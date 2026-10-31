import { describe, expect, it } from 'vitest'

import { buildRegions, listYears, pickYear } from './helpers.js'
import type { RegionRow } from './helpers.js'

const FILES = [
  { year: 2024, period: 12 },
  { year: 2025, period: 12 },
  { year: 2026, period: 9 },
  { year: 2026, period: 6 }
]

describe('pickYear', () => {
  it('defaults to the latest full year, not the year-to-date file', () => {
    expect(pickYear(FILES)).toEqual({ year: 2025, period: 12, partial: false })
  })

  it('takes the newest period of an asked year', () => {
    expect(pickYear(FILES, 2026)).toEqual({ year: 2026, period: 9, partial: true })
  })

  it('falls back to the latest file when no year is complete, and is null for an unknown year', () => {
    expect(pickYear([{ year: 2026, period: 3 }])).toEqual({ year: 2026, period: 3, partial: true })
    expect(pickYear(FILES, 2019)).toBeNull()
    expect(pickYear([])).toBeNull()
  })
})

describe('listYears', () => {
  it('lists one entry per year, newest first', () => {
    expect(listYears(FILES).map(y => [y.year, y.period])).toEqual([
      [2026, 9],
      [2025, 12],
      [2024, 12]
    ])
  })
})

describe('buildRegions', () => {
  const row = (region: string, deaths: number, crashes = deaths * 8): RegionRow => ({
    region,
    crashes,
    deaths,
    injured: 0,
    pedestrianCrashes: null,
    childCrashes: null
  })

  it('ranks by deaths and by deaths per 100k cars, sharing ranks on ties', () => {
    const regions = buildRegions(
      [row('А', 100), row('Б', 200), row('В', 200), row('Г', 50)],
      new Map([
        ['А', 100_000],
        ['Б', 1_000_000],
        ['В', 400_000],
        ['Г', 10_000]
      ])
    )
    expect(regions.map(r => [r.region, r.rankDeaths, r.rankDeathsPer100k])).toEqual([
      ['Б', 1, 4],
      ['В', 1, 3],
      ['А', 3, 2],
      ['Г', 4, 1]
    ])
    expect(regions.find(r => r.region === 'В')).toMatchObject({ deathsPer100k: 50, fleet: 400_000 })
  })

  it('leaves the rate and its rank null for a region without a fleet', () => {
    const [only] = buildRegions([row('А', 10)], new Map())
    expect(only).toMatchObject({ fleet: null, deathsPer100k: null, crashesPer100k: null, rankDeathsPer100k: null })
  })
})
