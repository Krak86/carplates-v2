import { describe, expect, it } from 'vitest'

import {
  barPercent,
  correlationStrength,
  fleetPoints,
  kmLabel,
  pearson,
  regionFacts,
  fillBuckets,
  hourLabel,
  mapRows,
  parseYearParam,
  partialMonth,
  peakBucket,
  rankedRegions,
  regionCrashFact
} from './helpers'

const region = (name: string, rankDeaths: number, rankRate: number | null) => ({
  region: name,
  crashes: 1,
  deaths: 1,
  injured: 1,
  fleet: 1,
  deathsPer100k: rankRate === null ? null : 1,
  crashesPer100k: null,
  rankDeaths,
  rankDeathsPer100k: rankRate
})

describe('parseYearParam', () => {
  it('accepts a plausible year only', () => {
    expect(parseYearParam('2025')).toBe(2025)
    expect(parseYearParam(null)).toBeUndefined()
    expect(parseYearParam('abc')).toBeUndefined()
    expect(parseYearParam('1800')).toBeUndefined()
    expect(parseYearParam('20.5')).toBeUndefined()
  })
})

describe('rankedRegions', () => {
  const rows = [region('A', 2, 1), region('B', 1, null), region('C', 3, 2)]

  it('orders by deaths rank', () => {
    expect(rankedRegions(rows, 'deaths').map(r => r.region)).toEqual(['B', 'A', 'C'])
  })

  it('orders by rate rank and drops regions without a rate', () => {
    expect(rankedRegions(rows, 'rate').map(r => r.region)).toEqual(['A', 'C'])
  })
})

describe('barPercent', () => {
  it('scales to the max, keeps small values visible, zero stays empty', () => {
    expect(barPercent(50, 100)).toBe(50)
    expect(barPercent(1, 1000)).toBe(2)
    expect(barPercent(0, 10)).toBe(0)
    expect(barPercent(5, 0)).toBe(0)
  })
})

describe('peakBucket', () => {
  it('returns the busiest bucket, the first on a tie, null when empty', () => {
    expect(
      peakBucket([
        { bucket: 1, crashes: 3 },
        { bucket: 2, crashes: 9 },
        { bucket: 3, crashes: 9 }
      ])?.bucket
    ).toBe(2)
    expect(peakBucket([])).toBeNull()
    expect(peakBucket([{ bucket: 1, crashes: 0 }])).toBeNull()
  })
})

describe('fillBuckets', () => {
  it('adds zero columns for missing buckets', () => {
    expect(fillBuckets([{ bucket: 1, crashes: 4 }], 0, 2)).toEqual([
      { bucket: 0, crashes: 0 },
      { bucket: 1, crashes: 4 },
      { bucket: 2, crashes: 0 }
    ])
  })
})

describe('labels', () => {
  it('pads hours', () => expect(hourLabel(7)).toBe('07:00'))

  it('reports the month of a partial year only', () => {
    expect(partialMonth({ year: 2026, period: 9, partial: true })).toBe(9)
    expect(partialMonth({ year: 2025, period: 12, partial: false })).toBeNull()
  })
})

describe('mapRows', () => {
  const rows = [{ ...region('A', 1, 1), deaths: 7, deathsPer100k: 3.456 }, region('B', 2, null)]

  it('maps deaths for every region', () => {
    expect(mapRows(rows, 'deaths')).toEqual([
      { label: 'A', value: 7 },
      { label: 'B', value: 1 }
    ])
  })

  it('maps the rate rounded to one decimal and skips regions without one', () => {
    expect(mapRows(rows, 'rate')).toEqual([{ label: 'A', value: 3.5 }])
  })
})

describe('regionCrashFact', () => {
  const data = {
    year: 2025,
    period: 12,
    years: [],
    national: { crashes: 3, deaths: 3, injured: 3 },
    regions: [region('A', 2, 1), { ...region('B', 1, 2), crashes: 40 }]
  }

  it('gives crashes, the deaths rank and the region count', () => {
    expect(regionCrashFact(data, 'B')).toEqual({ year: 2025, crashes: 40, rank: 1, of: 2 })
  })

  it('is null for an unknown or missing region', () => {
    expect(regionCrashFact(data, 'C')).toBeNull()
    expect(regionCrashFact(data, null)).toBeNull()
  })
})

describe('pearson', () => {
  it('is 1 for a perfect line and -1 for a falling one', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1)
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1)
  })

  it('is null for too few points or no variance', () => {
    expect(pearson([1, 2], [1, 2])).toBeNull()
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull()
  })
})

describe('correlationStrength', () => {
  it('buckets |r|', () => {
    expect(correlationStrength(0.1)).toBe('none')
    expect(correlationStrength(-0.4)).toBe('weak')
    expect(correlationStrength(0.6)).toBe('moderate')
    expect(correlationStrength(-0.95)).toBe('strong')
  })
})

describe('fleetPoints and regionFacts', () => {
  const rows = [
    { ...region('A', 1, 1), fleet: 100, deaths: 50, crashes: 200 },
    { ...region('B', 2, 2), fleet: 100, deaths: 30, crashes: 400 },
    { ...region('C', 3, 3), fleet: 200, deaths: 20, crashes: 300 },
    { ...region('D', 4, null), fleet: null, deaths: 5, crashes: 50 }
  ]

  it('ratios compare the share of deaths with the share of cars', () => {
    const points = fleetPoints(rows)
    expect(points).toHaveLength(3)
    expect(points.find(p => p.region === 'A')?.ratio).toBeCloseTo(2)
    expect(points.find(p => p.region === 'C')?.ratio).toBeCloseTo(0.4)
  })

  it('finds the extremes', () => {
    const f = regionFacts(rows)
    expect(f?.mostDeaths.region).toBe('A')
    expect(f?.fewestDeaths.region).toBe('D')
    expect(f?.deadliest?.region).toBe('A')
    expect(f?.safest?.region).toBe('C')
    expect(f?.overRepresented?.region).toBe('A')
    expect(f?.underRepresented?.region).toBe('C')
  })

  it('is null with fewer than three regions', () => {
    expect(regionFacts(rows.slice(0, 2))).toBeNull()
  })
})

describe('kmLabel', () => {
  it('formats metres as km+m', () => {
    expect(kmLabel(12300)).toBe('12+300')
    expect(kmLabel(5)).toBe('0+005')
    expect(kmLabel(null)).toBe('')
  })
})
