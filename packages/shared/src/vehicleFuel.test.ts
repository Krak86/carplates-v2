import { describe, expect, it } from 'vitest'

import { fuelKeyword, resolveFuelCategories, VEHICLE_FUELS } from './vehicleFuel.js'

describe('resolveFuelCategories', () => {
  it('maps each base fuel found in the live registry', () => {
    expect(resolveFuelCategories('БЕНЗИН')).toEqual(['petrol'])
    expect(resolveFuelCategories('ДИЗЕЛЬНЕ ПАЛИВО')).toEqual(['diesel'])
    expect(resolveFuelCategories('ГАЗ')).toEqual(['gas'])
    expect(resolveFuelCategories('ЕЛЕКТРО')).toEqual(['electric'])
    expect(resolveFuelCategories('ВОДЕНЬ')).toEqual(['hydrogen'])
  })

  it('returns every category present in a hybrid/combo value, in VEHICLE_FUELS order', () => {
    expect(resolveFuelCategories('БЕНЗИН АБО ГАЗ')).toEqual(['petrol', 'gas'])
    expect(resolveFuelCategories('ЕЛЕКТРО АБО БЕНЗИН')).toEqual(['electric', 'petrol'])
    expect(resolveFuelCategories('БЕНЗИН, ГАЗ АБО ЕЛЕКТРО')).toEqual(['electric', 'petrol', 'gas'])
  })

  it('returns an empty array for null, blank, and unknown/absent markers', () => {
    expect(resolveFuelCategories(null)).toEqual([])
    expect(resolveFuelCategories(undefined)).toEqual([])
    expect(resolveFuelCategories('')).toEqual([])
    expect(resolveFuelCategories('НЕ ВИЗНАЧЕНО')).toEqual([])
    expect(resolveFuelCategories('ВІДСУТНЄ')).toEqual([])
    expect(resolveFuelCategories('.')).toEqual([])
  })
})

describe('fuelKeyword', () => {
  it('round-trips through resolveFuelCategories for every canonical fuel', () => {
    for (const fuel of VEHICLE_FUELS) {
      expect(resolveFuelCategories(fuelKeyword(fuel))).toContain(fuel)
    }
  })
})
