import { describe, it, expect } from 'vitest'

import { parseCatalogOverrides } from './catalog-overrides.js'
import { buildTaxonomy, makeNameFromSlug, modelNameFromKey, prettify } from './catalog-taxonomy.js'

const NO_OVERRIDES = parseCatalogOverrides('kind,a,b,c,d')

describe('buildTaxonomy', () => {
  it('sums the pairs of one page, ranks by count and flags thin pages', () => {
    const { aliases, models } = buildTaxonomy(
      [
        { brand: 'BMW', model: '320D', n: 3000 },
        { brand: 'BMW', model: '520I', n: 100 },
        { brand: 'DAEWOO', model: 'LANOS', n: 8000 },
        { brand: 'ЗАЗ', model: 'LANOS', n: 2000 },
        { brand: 'BMW', model: 'X5', n: 60 },
        { brand: 'BMW', model: 'Z4', n: 10 }
      ],
      new Set(),
      NO_OVERRIDES
    )
    expect(aliases).toHaveLength(6)
    expect(models.map(m => `${m.makeSlug}/${m.modelSlug}:${m.n}`)).toEqual([
      'zaz/lanos:10000',
      'bmw/3series:3000',
      'bmw/5series:100',
      'bmw/x5:60'
    ])
    expect(models[0]).toMatchObject({ topBrand: 'DAEWOO', rank: 1, indexable: true })
    expect(models[2]).toMatchObject({ rank: 3, indexable: false })
  })

  it('applies alias and drop overrides', () => {
    const o = parseCatalogOverrides('kind,a,b,c,d\nalias,BMW,X5,bmw,x5m\ndrop,bmw,3series')
    const { models } = buildTaxonomy(
      [
        { brand: 'BMW', model: 'X5', n: 500 },
        { brand: 'BMW', model: '320D', n: 500 }
      ],
      new Set(),
      o
    )
    expect(models.map(m => m.modelSlug)).toEqual(['x5m'])
  })
})

describe('buildTaxonomy fold override', () => {
  it('merges a page into another', () => {
    const o = parseCatalogOverrides('kind,a,b,c,d\nfold,bmw,3series,bmw,5series')
    const { models } = buildTaxonomy(
      [
        { brand: 'BMW', model: '320D', n: 300 },
        { brand: 'BMW', model: '520D', n: 400 }
      ],
      new Set(),
      o
    )
    expect(models).toHaveLength(1)
    expect(models[0]).toMatchObject({ modelSlug: '5series', n: 700, topModel: '520D' })
  })
})

describe('names', () => {
  it('prettifies shouting text but keeps codes', () => {
    expect(prettify('LAND CRUISER')).toBe('Land Cruiser')
    expect(prettify('X5 M')).toBe('X5 M')
    expect(prettify('Golf')).toBe('Golf')
  })

  it('names makes and models without a catalog entry', () => {
    expect(makeNameFromSlug('mercedes-benz')).toBe('Mercedes-Benz')
    expect(makeNameFromSlug('bmw')).toBe('BMW')
    expect(modelNameFromKey('3series', '320D')).toBe('3 Series')
    expect(modelNameFromKey('eclass', 'E 200')).toBe('E-Class')
    expect(modelNameFromKey('passat', 'PASSAT')).toBe('Passat')
  })
})
