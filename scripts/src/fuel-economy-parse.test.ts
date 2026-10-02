import { describe, expect, it } from 'vitest'

import { epaFuelCategory, parseEpaRow } from './fuel-economy-parse.js'

const base = {
  id: '1',
  make: 'Toyota',
  model: 'Camry',
  year: '2021',
  fuelType1: 'Regular Gasoline',
  comb08: '32',
  co2TailpipeGpm: '278',
  displ: '2.5',
  cylinders: '4',
  combE: '0'
}

describe('parseEpaRow', () => {
  it('normalizes units: g/mi → g/km, mpg → L/100km, litres → cc', () => {
    const row = parseEpaRow(base)!
    expect(row.id).toBe('epa:1')
    expect(row.makeKey).toBe('toyota')
    expect(row.modelKey).toBe('camry')
    expect(row.co2GKm).toBe(173)
    expect(row.l100km).toBe(7.4)
    expect(row.engineCc).toBe(2500)
    expect(row.fuelCategory).toBe('petrol')
  })

  it('treats a pure EV as 0 g/km tailpipe with kWh/100km', () => {
    const row = parseEpaRow({ ...base, fuelType1: 'Electricity', co2TailpipeGpm: '0', combE: '30', displ: '' })!
    expect(row.co2GKm).toBe(0)
    expect(row.l100km).toBeNull()
    expect(row.evKwh100km).toBe(18.6)
    expect(row.engineCc).toBeNull()
  })

  it('drops rows missing identity or CO2', () => {
    expect(parseEpaRow({ ...base, make: '' })).toBeNull()
    expect(parseEpaRow({ ...base, co2TailpipeGpm: '' })).toBeNull()
  })
})

describe('epaFuelCategory', () => {
  it('maps EPA fuel labels', () => {
    expect(epaFuelCategory('Premium Gasoline')).toBe('petrol')
    expect(epaFuelCategory('Diesel')).toBe('diesel')
    expect(epaFuelCategory('Natural Gas')).toBe('gas')
  })
})
