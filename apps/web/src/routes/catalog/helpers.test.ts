import { describe, expect, it } from 'vitest'

import { biggestYears, filterMakes, filterModels, sharePercent, typicalYear, yearRangeLabel } from './helpers'

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

describe('filterModels', () => {
  const models = [
    { model: 'golf', modelName: 'Golf' },
    { model: 'golf-plus', modelName: 'Golf Plus' },
    { model: 'id-4', modelName: 'ID.4' }
  ]

  it('matches the model name or slug, ignoring case and spaces around', () => {
    expect(filterModels(models, ' GOLF ').map(m => m.model)).toEqual(['golf', 'golf-plus'])
    expect(filterModels(models, 'id-4').map(m => m.model)).toEqual(['id-4'])
    expect(filterModels(models, 'xyz')).toEqual([])
  })

  it('returns every model for an empty filter', () => {
    expect(filterModels(models, ' ')).toBe(models)
  })
})

describe('filterMakes', () => {
  const makes = [
    {
      make: 'mercedes-benz',
      makeName: 'Mercedes-Benz',
      n: 5,
      modelCount: 1,
      topBrand: 'MERCEDES-BENZ',
      indexable: true
    },
    { make: 'skoda', makeName: 'Škoda', n: 4, modelCount: 1, topBrand: 'SKODA', indexable: true }
  ]

  it('matches the name or the slug, ignoring case and spaces around the text', () => {
    expect(filterMakes(makes, ' MERC ').map(m => m.make)).toEqual(['mercedes-benz'])
    expect(filterMakes(makes, 'skoda').map(m => m.make)).toEqual(['skoda'])
    expect(filterMakes(makes, 'xyz')).toEqual([])
  })

  it('returns every make for an empty filter', () => {
    expect(filterMakes(makes, '  ')).toBe(makes)
  })
})
