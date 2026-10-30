import { describe, expect, it } from 'vitest'

import { biggestYears, sharePercent, typicalYear, yearRangeLabel } from './helpers'

describe('catalog helpers', () => {
  it('picks the year with the most cars', () => {
    expect(
      typicalYear([
        ['2005', 10],
        ['2010', 30],
        ['2012', 20]
      ])
    ).toBe(2010)
    expect(typicalYear([])).toBeNull()
  })

  it('labels the year range', () => {
    expect(yearRangeLabel({ yearMin: 2005, yearMax: 2024 })).toBe('2005-2024')
    expect(yearRangeLabel({ yearMin: 2010, yearMax: 2010 })).toBe('2010')
    expect(yearRangeLabel({ yearMin: null, yearMax: null })).toBeNull()
  })

  it('computes shares and the biggest years oldest first', () => {
    expect(sharePercent(1, 3)).toBe(33)
    expect(sharePercent(1, 0)).toBe(0)
    expect(
      biggestYears(
        [
          ['2001', 1],
          ['2003', 9],
          ['2002', 5]
        ],
        2
      )
    ).toEqual([
      ['2002', 5],
      ['2003', 9]
    ])
  })
})
