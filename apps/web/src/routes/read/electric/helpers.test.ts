import { describe, expect, it } from 'vitest'

import { bevShare, evYears, peakYear, topRegions } from '@/routes/read/electric/helpers'

describe('evYears', () => {
  it('keeps model years from 2010 that have an electrified car', () => {
    const rows = [
      { year: 2005, bev: 3, hybrid: 0, fleet: 100 },
      { year: 2012, bev: 0, hybrid: 0, fleet: 100 },
      { year: 2013, bev: 0, hybrid: 4, fleet: 100 },
      { year: 2020, bev: 9, hybrid: 1, fleet: 100 }
    ]
    expect(evYears(rows).map(y => y.year)).toEqual([2013, 2020])
  })
})

describe('bevShare', () => {
  it('rounds to one decimal and survives an empty year', () => {
    expect(bevShare({ bev: 1, fleet: 3 })).toBe(33.3)
    expect(bevShare({ bev: 5, fleet: 0 })).toBe(0)
  })
})

describe('peakYear', () => {
  it('finds the year with the most electric-only cars', () => {
    const years = [
      { year: 2019, bev: 4, hybrid: 0, fleet: 10 },
      { year: 2021, bev: 9, hybrid: 0, fleet: 10 }
    ]
    expect(peakYear(years)?.year).toBe(2021)
    expect(peakYear([])).toBeNull()
  })
})

describe('topRegions', () => {
  it('orders by electrified cars and caps the list', () => {
    const regions = Array.from({ length: 12 }, (_, i) => ({ region: `r${i}`, bev: i, hybrid: 0, fleet: 100 }))
    const top = topRegions(regions)
    expect(top).toHaveLength(10)
    expect(top[0]?.region).toBe('r11')
  })
})
