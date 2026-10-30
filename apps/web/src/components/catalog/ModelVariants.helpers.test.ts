import { describe, expect, it } from 'vitest'

import { carsInSpan, generationOfYear, variantOptions, variantYears, yearInSpan } from './ModelVariants.helpers'

const YEARS: [string, number][] = [
  ['1999', 1],
  ['2005', 500],
  ['2006', 800],
  ['2007', 700],
  ['2012', 400],
  ['2020', 600]
]

describe('variantYears', () => {
  it('keeps the years with a real share of the cars, oldest first', () => {
    expect(variantYears(YEARS, 3001)).toEqual([2005, 2006, 2007, 2012, 2020])
  })

  it('falls back to the biggest years when none reaches the share', () => {
    expect(variantYears([['2010', 1]], 1000)).toEqual([2010])
    expect(variantYears([], 1000)).toEqual([])
  })
})

describe('generationOfYear', () => {
  const gens = [
    { code: 'E53', yearFrom: 1999, yearTo: 2007 },
    { code: 'E70', yearFrom: 2006, yearTo: 2013 },
    { code: 'G65', yearFrom: 2026, yearTo: null }
  ]

  it('takes the newest generation on a boundary year', () => {
    expect(generationOfYear(gens, 2006)?.code).toBe('E70')
    expect(generationOfYear(gens, 2000)?.code).toBe('E53')
  })

  it('handles an open span, a gap and no year', () => {
    expect(generationOfYear(gens, 2030)?.code).toBe('G65')
    expect(generationOfYear(gens, 2015)).toBeNull()
    expect(generationOfYear(gens, null)).toBeNull()
  })
})

describe('yearInSpan', () => {
  it('picks the year with the most cars inside the span', () => {
    expect(yearInSpan(YEARS, { yearFrom: 2005, yearTo: 2007 })).toBe(2006)
    expect(yearInSpan(YEARS, { yearFrom: 2013, yearTo: null })).toBe(2020)
  })

  it('uses the first year of a span with no cars', () => {
    expect(yearInSpan(YEARS, { yearFrom: 2014, yearTo: 2018 })).toBe(2014)
  })
})

describe('variantOptions', () => {
  it('localizes, collapses words that read the same and drops slivers and junk', () => {
    const rows: [string, number][] = [
      ['СЕДАН', 600],
      ['СЕДАН-B', 200],
      ['УНІВЕРСАЛ', 150],
      ['NULL', 100],
      ['ХЕТЧБЕК', 10]
    ]
    const options = variantOptions('body', rows, 1060, 'en')
    expect(options.map(o => o.value)).toEqual(['СЕДАН', 'УНІВЕРСАЛ'])
    expect(options.map(o => o.label)).not.toContain('null')
  })
})

describe('carsInSpan', () => {
  it('sums the cars whose year is inside the span, open-ended when the generation is current', () => {
    expect(carsInSpan(YEARS, { yearFrom: 2005, yearTo: 2007 })).toBe(2000)
    expect(carsInSpan(YEARS, { yearFrom: 2012, yearTo: null })).toBe(1000)
    expect(carsInSpan(YEARS, { yearFrom: 1990, yearTo: 1995 })).toBe(0)
  })
})
