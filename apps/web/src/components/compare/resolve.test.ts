import type { CatalogModel, PlateLookupResponse, VinDecodeResponse } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import { carFromModel, carFromPlate, carFromVin, fuelWordOf, nhtsaFuelKeyword } from './resolve'

const registration = {
  plate: 'АА1234ВВ',
  person: 'SECRET OWNER NAME',
  regAddrKoatuu: null,
  operCode: 100,
  operName: 'ПЕРВИННА РЕЄСТРАЦІЯ',
  dReg: '2021-03-04',
  depCode: null,
  dep: null,
  brand: 'BMW',
  model: '320D',
  vin: 'WBA8E9C50GK123456',
  makeYear: 2016,
  color: 'ЧОРНИЙ',
  kind: 'ЛЕГКОВИЙ',
  body: 'СЕДАН',
  purpose: null,
  fuel: 'ДИЗЕЛЬНЕ ПАЛИВО',
  capacity: 1995,
  powerKwt: null,
  ownWeight: 1490,
  totalWeight: 2050,
  plateInferred: false
}

const plateData: PlateLookupResponse = {
  plate: 'АА1234ВВ',
  region: 'Київ',
  current: registration,
  historyCount: 4,
  ownersCount: 2,
  everImported: true
}

describe('carFromPlate', () => {
  const car = carFromPlate({ kind: 'plate', plate: 'АА1234ВВ' }, plateData)

  it('copies the model-level inputs of the registry row', () => {
    expect(car).toMatchObject({
      brand: 'BMW',
      model: '320D',
      year: 2016,
      kind: 'ЛЕГКОВИЙ',
      fuel: 'ДИЗЕЛЬНЕ ПАЛИВО',
      capacity: 1995,
      body: 'СЕДАН',
      ownWeight: 1490,
      totalWeight: 2050
    })
  })

  it('carries the exact-car facts and the lookup counts', () => {
    expect(car.exact).toMatchObject({
      region: 'Київ',
      ownersCount: 2,
      historyCount: 4,
      everImported: true,
      registeredYear: 2021,
      color: 'ЧОРНИЙ'
    })
  })

  it('never carries the owner', () => {
    expect(JSON.stringify(car)).not.toContain('SECRET OWNER NAME')
  })
})

describe('carFromVin', () => {
  it('prefers our registry row when the VIN is in it', () => {
    const data: VinDecodeResponse = {
      vin: 'WBA8E9C50GK123456',
      results: [{ variable: 'Make', value: 'OTHER' }],
      registry: { plate: 'АА1234ВВ', plateInferred: false, actions: [registration, registration] }
    }
    const car = carFromVin({ kind: 'vin', vin: data.vin }, data)
    expect(car.brand).toBe('BMW')
    expect(car.exact).toMatchObject({ plate: 'АА1234ВВ', historyCount: 2, vin: data.vin })
    expect(JSON.stringify(car)).not.toContain('SECRET OWNER NAME')
  })

  it('falls back to the NHTSA decode', () => {
    const data: VinDecodeResponse = {
      vin: '1HGCM82633A004352',
      results: [
        { variable: 'Make', value: 'HONDA' },
        { variable: 'Model', value: 'Accord' },
        { variable: 'Model Year', value: '2003' },
        { variable: 'Fuel Type - Primary', value: 'Gasoline' },
        { variable: 'Displacement (L)', value: '3.0' },
        { variable: 'Engine Power (kW)', value: '179' }
      ]
    }
    const car = carFromVin({ kind: 'vin', vin: data.vin }, data)
    expect(car).toMatchObject({
      brand: 'HONDA',
      model: 'Accord',
      year: 2003,
      fuel: 'БЕНЗИН',
      capacity: 3000,
      powerKw: 179,
      kind: null,
      body: null
    })
    expect(car.exact?.vin).toBe(data.vin)
  })

  it('leaves unreadable numbers empty', () => {
    const data: VinDecodeResponse = {
      vin: '1HGCM82633A004352',
      results: [
        { variable: 'Make', value: 'HONDA' },
        { variable: 'Model Year', value: 'n/a' }
      ]
    }
    const car = carFromVin({ kind: 'vin', vin: data.vin }, data)
    expect(car.year).toBeNull()
    expect(car.capacity).toBeNull()
    expect(car.fuel).toBeNull()
  })
})

describe('nhtsaFuelKeyword', () => {
  it('maps NHTSA words to the registry keyword the fuel helpers read', () => {
    expect(nhtsaFuelKeyword('Diesel')).toBe('ДИЗЕЛЬНЕ')
    expect(nhtsaFuelKeyword('Electric')).toBe('ЕЛЕКТРО')
    expect(nhtsaFuelKeyword('Compressed Natural Gas (CNG)')).toBe('ГАЗ')
    expect(nhtsaFuelKeyword('Flex Fuel')).toBeNull()
    expect(nhtsaFuelKeyword(undefined)).toBeNull()
  })
})

const model = {
  make: 'bmw',
  model: '3series',
  makeName: 'BMW',
  modelName: '3 Series',
  n: 1000,
  yearMin: 1995,
  yearMax: 2022,
  topBrand: 'BMW',
  topModel: '320',
  kind: 'ЛЕГКОВИЙ',
  indexable: true,
  siblings: [],
  stats: {
    years: [['2015', 300]],
    registered: [],
    fuel: [
      ['БЕНЗИН', 600],
      ['ДИЗЕЛЬНЕ ПАЛИВО', 400]
    ],
    body: [['СЕДАН', 700]],
    color: [],
    regions: [],
    capacityP50: 1998,
    powerP50: 135
  }
} as CatalogModel

describe('fuelWordOf', () => {
  it('finds the registry word of a fuel class, else the biggest', () => {
    expect(fuelWordOf(model, 'diesel')).toBe('ДИЗЕЛЬНЕ ПАЛИВО')
    expect(fuelWordOf(model, null)).toBe('БЕНЗИН')
    expect(fuelWordOf(model, 'electric')).toBeNull()
  })
})

describe('carFromModel', () => {
  it('uses the medians only for the dominant fuel', () => {
    const typical = carFromModel({ kind: 'model', make: 'bmw', model: '3series', year: 2015, fuel: null }, model)
    expect(typical).toMatchObject({
      brand: 'BMW',
      model: '320',
      year: 2015,
      fuel: 'БЕНЗИН',
      capacity: 1998,
      powerKw: 135
    })

    const diesel = carFromModel({ kind: 'model', make: 'bmw', model: '3series', year: 2015, fuel: 'diesel' }, model)
    expect(diesel).toMatchObject({ fuel: 'ДИЗЕЛЬНЕ ПАЛИВО', capacity: null, powerKw: null })
  })

  it('has no exact-car facts', () => {
    expect(
      carFromModel({ kind: 'model', make: 'bmw', model: '3series', year: 2015, fuel: null }, model).exact
    ).toBeNull()
  })

  it('keeps a fuel class the model has no cars of as a keyword (the fuel rows still apply)', () => {
    const ev = carFromModel({ kind: 'model', make: 'bmw', model: '3series', year: 2015, fuel: 'electric' }, model)
    expect(ev.fuel).toBe('ЕЛЕКТРО')
  })
})
