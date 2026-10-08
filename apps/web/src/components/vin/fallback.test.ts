import { describe, it, expect } from 'vitest'

import { buildFallback, fallbackSources, toFieldMap, typicalLookup } from '@/components/vin/helpers'

describe('buildFallback', () => {
  const empty = toFieldMap([])

  it('fills gaps from the prefix and year code, labelled by source', () => {
    const f = buildFallback('KNAPC81ABHK000001', empty, undefined)
    expect(f.make).toEqual({ value: 'Kia', source: 'wmi' })
    expect(f.country).toEqual({ value: 'KR', source: 'wmi' })
    expect(f.year?.source).toBe('yearCode')
    expect(fallbackSources(f)).toEqual(['wmi', 'yearCode'])
  })

  it('prefers the registry record over the prefix table', () => {
    const f = buildFallback('KNAPC81ABHK000001', empty, { brand: 'KIA', model: 'SPORTAGE', makeYear: 2017 })
    expect(f.make).toEqual({ value: 'KIA', source: 'registry' })
    expect(f.model).toEqual({ value: 'SPORTAGE', source: 'registry' })
    expect(f.year).toEqual({ value: 2017, source: 'registry' })
  })

  it('never overrides what NHTSA decoded', () => {
    const fields = toFieldMap([
      { variable: 'Make', value: 'KIA' },
      { variable: 'Plant Country', value: 'SOUTH KOREA' },
      { variable: 'Model Year', value: '2017' }
    ])
    const f = buildFallback('KNAPC81ABHK000001', fields, { brand: 'X', model: null, makeYear: 2001 })
    expect(f).toEqual({})
  })
})

describe('typicalLookup', () => {
  it('needs a make and model', () => {
    const f = buildFallback('KNAPC81ABHK000001', toFieldMap([]), undefined)
    expect(typicalLookup(toFieldMap([]), f)).toBeNull()
  })

  it('uses NHTSA values, maps fuel / kind, and reports estimated inputs', () => {
    const fields = toFieldMap([
      { variable: 'Make', value: 'KIA' },
      { variable: 'Model', value: 'Sportage' },
      { variable: 'Vehicle Type', value: 'PASSENGER CAR' },
      { variable: 'Fuel Type - Primary', value: 'Diesel' },
      { variable: 'Displacement (L)', value: '2.0' }
    ])
    const f = buildFallback('KNAPC81ABHK000001', fields, undefined)
    expect(typicalLookup(fields, f)).toMatchObject({
      brand: 'KIA',
      model: 'Sportage',
      kind: 'ЛЕГКОВИЙ',
      fuel: 'ДИЗЕЛЬНЕ',
      capacity: 2000,
      inputSources: ['yearCode']
    })
  })
})
