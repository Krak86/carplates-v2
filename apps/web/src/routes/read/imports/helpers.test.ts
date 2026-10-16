import { describe, expect, it } from 'vitest'

import { importShare, peakImportYear, percentOf, splitCountries } from '@/routes/read/imports/helpers'

describe('importShare', () => {
  it('is the import share of imported + dealer cars and survives an empty year', () => {
    expect(importShare({ import: 1, dealer: 2 })).toBe(33.3)
    expect(importShare({ import: 0, dealer: 0 })).toBe(0)
  })
})

describe('peakImportYear', () => {
  it('finds the year with the most imports', () => {
    const years = [
      { year: 2019, import: 4, dealer: 9 },
      { year: 2021, import: 9, dealer: 1 }
    ]
    expect(peakImportYear(years)?.year).toBe(2021)
    expect(peakImportYear([])).toBeNull()
  })
})

describe('splitCountries', () => {
  it('separates US / Canada, unknown and the rest', () => {
    const split = splitCountries([
      { country: 'DE', n: 10 },
      { country: 'US', n: 5 },
      { country: 'CA', n: 1 },
      { country: '', n: 4 }
    ])
    expect(split).toEqual({ northAmerica: 6, unknown: 4, other: 10, total: 20 })
  })
})

describe('percentOf', () => {
  it('rounds to one decimal and survives a zero whole', () => {
    expect(percentOf(1, 3)).toBe(33.3)
    expect(percentOf(5, 0)).toBe(0)
  })
})
