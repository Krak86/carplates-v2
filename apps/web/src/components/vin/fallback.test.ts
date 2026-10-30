import { describe, it, expect } from 'vitest'

import { buildFallback, fallbackSources, manufacturerOf, toFieldMap, typicalLookup } from '@/components/vin/helpers'

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

  it('reads the model family of an EU Kia from the 4th character', () => {
    const f = buildFallback('U5YHN512BDL007162', empty, undefined)
    expect(f.make).toEqual({ value: 'Kia', source: 'vds' })
    expect(f.model).toEqual({ value: "Cee'd", source: 'vds' })
    expect(fallbackSources(f)).toEqual(['wmi', 'vds', 'yearCode'])
    expect(typicalLookup(empty, f)).toMatchObject({ brand: 'Kia', model: "Cee'd" })
  })

  it('prefers the registry model over the 4th-character one, and skips a different registry make', () => {
    expect(buildFallback('U5YHN512BDL007162', empty, { brand: 'KIA', model: 'CEED' }).model?.source).toBe('registry')
    expect(buildFallback('U5YHN512BDL007162', empty, { brand: 'FORD', model: null }).model).toBeUndefined()
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

describe('manufacturerOf', () => {
  const hatci = toFieldMap([
    { variable: 'Manufacturer Name', value: 'HYUNDAI-KIA AMERICA TECHNICAL CENTER INC (HATCI)' }
  ])

  it('swaps a US importer for the prefix maker when the car is built outside North America', () => {
    const f = buildFallback('U5YHN512BDL007162', hatci, undefined)
    expect(manufacturerOf(hatci, f)).toEqual({ value: 'Kia', derived: true })
  })

  it("keeps NHTSA's manufacturer when the plant is in North America or NHTSA gave a plant country", () => {
    const us = buildFallback('5XYPG4A31GG000001', hatci, undefined)
    expect(manufacturerOf(hatci, us).derived).toBe(false)
    const withPlant = toFieldMap([
      { variable: 'Manufacturer Name', value: 'KIA' },
      { variable: 'Plant Country', value: 'SLOVAKIA' }
    ])
    expect(manufacturerOf(withPlant, buildFallback('U5YHN512BDL007162', withPlant, undefined))).toEqual({
      value: 'KIA',
      derived: false
    })
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
