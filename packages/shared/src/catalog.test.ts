import { describe, expect, it } from 'vitest'

import { sumYearStats } from './catalog.js'

const stats = {
  byYear: {
    '2005': {
      n: 10,
      fuel: [
        ['diesel', 6],
        ['petrol', 4]
      ] as [string, number][],
      body: [],
      color: [],
      regions: [['Kyiv', 10]] as [string, number][]
    },
    '2006': {
      n: 20,
      fuel: [
        ['petrol', 15],
        ['diesel', 5]
      ] as [string, number][],
      body: [],
      color: [],
      regions: [['Lviv', 20]] as [string, number][]
    },
    '2012': { n: 5, fuel: [['diesel', 5]] as [string, number][], body: [], color: [], regions: [] }
  }
}

describe('sumYearStats', () => {
  it('adds the years inside the span and ranks each list biggest first', () => {
    const sums = sumYearStats(stats, 2005, 2006)
    expect(sums.n).toBe(30)
    expect(sums.fuel).toEqual([
      ['petrol', 19],
      ['diesel', 11]
    ])
    expect(sums.regions).toEqual([
      ['Lviv', 20],
      ['Kyiv', 10]
    ])
  })

  it('treats a null end as open and an empty span as zero', () => {
    expect(sumYearStats(stats, 2006, null).n).toBe(25)
    expect(sumYearStats(stats, 1990, 1995).n).toBe(0)
  })
})
