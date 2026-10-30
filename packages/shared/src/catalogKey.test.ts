import { describe, it, expect } from 'vitest'

import { catalogSlugs, foldKnownModel } from './catalogKey.js'

const KNOWN = new Set([
  'mercedesbenz|sprinter',
  'toyota|landcruiser',
  'toyota|landcruiserprado',
  'daf|xf',
  'volkswagen|passat',
  'kia|ceed',
  'opel|astra'
])

const slugs = (brand: string, model: string) => catalogSlugs(brand, model, KNOWN)

describe('catalogSlugs', () => {
  it('folds BMW trim codes into the series', () => {
    expect(slugs('BMW', '320D')).toMatchObject({ make: 'bmw', model: '3series' })
    expect(slugs('BMW', '530D')).toMatchObject({ make: 'bmw', model: '5series' })
  })

  it('folds Sprinter trims, including the model repeated in the brand (double space)', () => {
    expect(slugs('MERCEDES-BENZ', 'SPRINTER 313 CDI')).toEqual({
      make: 'mercedes-benz',
      model: 'sprinter',
      how: 'fold'
    })
    expect(slugs('MERCEDES-BENZ  SPRINTER 313 CDI', 'SPRINTER 313 CDI')).toMatchObject({
      make: 'mercedes-benz',
      model: 'sprinter'
    })
    expect(slugs('MERCEDES-BENZ', '313 CDI')).toMatchObject({ make: 'mercedes-benz', model: 'sprinter' })
  })

  it('folds Mercedes class codes', () => {
    expect(slugs('MERCEDES-BENZ', 'E 200')).toMatchObject({ make: 'mercedes-benz', model: 'eclass' })
  })

  it('keeps Prado apart from Land Cruiser and folds their trims', () => {
    expect(slugs('TOYOTA', 'LAND CRUISER 200')).toMatchObject({ make: 'toyota', model: 'landcruiser' })
    expect(slugs('TOYOTA  LAND CRUISER 200', 'LAND CRUISER 200')).toMatchObject({
      make: 'toyota',
      model: 'landcruiser'
    })
    expect(slugs('TOYOTA', 'LAND CRUISER PRADO 150')).toMatchObject({ make: 'toyota', model: 'landcruiserprado' })
    expect(slugs('TOYOTA', 'LAND CRUISER PRADO')).toMatchObject({ model: 'landcruiserprado' })
  })

  it('maps VAZ factory codes to the model', () => {
    const r = slugs('ВАЗ', '21099')
    expect(r).toMatchObject({ model: '2109', how: 'wiki' })
    expect(slugs('ВАЗ', '210994-20')?.model).toBe('2109')
    expect(slugs('ваз 21063', '21063')?.model).toBe('2106')
    expect(slugs('ВАЗ', '21099')?.make).toBe(slugs('LADA', '21099')?.make)
  })

  it('makes Lanos and Sens one page under zaz whatever the brand', () => {
    for (const [brand, model] of [
      ['DAEWOO', 'LANOS'],
      ['ЗАЗ', 'LANOS'],
      ['ЗАЗ-DAEWOO', 'LANOS'],
      ['CHEVROLET', 'LANOS']
    ] as const) {
      expect(slugs(brand, model)).toEqual({ make: 'zaz', model: 'lanos', how: 'family' })
    }
    expect(slugs('DAEWOO', 'SENS')).toEqual({ make: 'zaz', model: 'sens', how: 'family' })
    expect(slugs('ЗАЗ', 'SENS')).toEqual({ make: 'zaz', model: 'sens', how: 'family' })
    // Other Daewoo models stay under Daewoo.
    expect(slugs('DAEWOO', 'MATIZ')).toMatchObject({ make: 'daewoo', model: 'matiz' })
  })

  it("keeps Cee'd and Mazda 3 clean", () => {
    expect(slugs('KIA', "CEE'D")).toMatchObject({ make: 'kia', model: 'ceed' })
    expect(slugs('KIA', "CEE'D SW")).toMatchObject({ model: 'ceed', how: 'fold' })
    expect(slugs('MAZDA', '3')).toMatchObject({ make: 'mazda', model: 'mazda3' })
    expect(slugs('MAZDA', '6')).toMatchObject({ model: 'mazda6' })
  })

  it('folds a truck engine code into its model', () => {
    expect(slugs('DAF', 'XF 105.460')).toMatchObject({ make: 'daf', model: 'xf', how: 'fold' })
  })

  it('merges the double-space brand form with the plain one', () => {
    expect(slugs('VOLKSWAGEN  PASSAT', 'PASSAT')).toMatchObject({ make: 'volkswagen', model: 'passat' })
    expect(slugs('VOLKSWAGEN', 'PASSAT')).toMatchObject({ make: 'volkswagen', model: 'passat' })
    expect(slugs('VOLKSWAGEN  PASSAT', 'PASSAT B6')).toMatchObject({ model: 'passat' })
  })

  it('returns null for unknown makes and non-Latin or missing models', () => {
    expect(slugs('NOSUCHBRANDXYZ', 'FOO')).toBeNull()
    expect(slugs('OPEL', 'ЛЕГКОВИЙ')).toBeNull()
    expect(slugs('OPEL', '')).toBeNull()
    expect(catalogSlugs(null, 'X5')).toBeNull()
  })
})

describe('foldKnownModel', () => {
  it('never folds a known model and picks the longest known prefix', () => {
    const known = new Set(['land|rover', 'land|roversport'])
    expect(foldKnownModel(known, 'land', 'ROVER SPORT')).toBe('roversport')
    expect(foldKnownModel(known, 'land', 'ROVER SPORT HSE')).toBe('roversport')
    expect(foldKnownModel(known, 'land', 'ROVER HSE')).toBe('rover')
    expect(foldKnownModel(known, 'land', 'OTHER 5')).toBe('other5')
  })
})
