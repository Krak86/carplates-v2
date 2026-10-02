import { describe, expect, it } from 'vitest'

import { matchModelRows, registryFuelClass, selectFuelEstimate } from './fuelMatch.js'
import type { FuelReferenceRow } from './fuelMatch.js'

type Row = FuelReferenceRow & { id: string }

function row(o: Partial<Row>): Row {
  return {
    id: 'epa:1',
    source: 'epa',
    cycle: 'EPA',
    modelKey: 'camry',
    modelYear: 2020,
    powertrain: 'ice',
    engineCc: 2500,
    l100km: 7,
    co2GKm: 160,
    evKwh100km: null,
    ...o
  }
}

describe('selectFuelEstimate', () => {
  it('returns a min–max range over the matched rows', () => {
    const e = selectFuelEstimate([row({ id: 'a', co2GKm: 150 }), row({ id: 'b', co2GKm: 170 })], { year: 2020 })
    expect(e).toMatchObject({ co2GKmMin: 150, co2GKmMax: 170, matches: 2, cycle: 'EPA' })
  })

  it('prefers hybrid rows for an "electric or petrol" registry fuel, and ice rows for plain petrol', () => {
    const rows = [
      row({ id: 'ice', powertrain: 'ice', co2GKm: 180 }),
      row({ id: 'hyb', powertrain: 'hybrid', co2GKm: 110 })
    ]
    expect(selectFuelEstimate(rows, { year: 2020, fuel: 'ЕЛЕКТРО АБО БЕНЗИН' })?.co2GKmMax).toBe(110)
    expect(selectFuelEstimate(rows, { year: 2020, fuel: 'БЕНЗИН' })?.co2GKmMin).toBe(180)
  })

  it('narrows to the registered engine capacity when any row is close enough', () => {
    const rows = [row({ id: 'a', engineCc: 2500, co2GKm: 160 }), row({ id: 'b', engineCc: 3500, co2GKm: 210 })]
    expect(selectFuelEstimate(rows, { year: 2020, capacity: 2487 })?.co2GKmMax).toBe(160)
    expect(selectFuelEstimate(rows, { year: 2020, capacity: 1000 })?.matches).toBe(2)
  })

  it('uses the nearest model year within the window and nothing beyond it', () => {
    expect(selectFuelEstimate([row({ modelYear: 2018 })], { year: 2020 })?.modelYear).toBe(2018)
    expect(selectFuelEstimate([row({ modelYear: 2010 })], { year: 2020 })).toBeNull()
  })

  it('prefers the exact year, then EEA over EPA on a tie, and never mixes sources', () => {
    const epa = row({ id: 'epa:1', source: 'epa', co2GKm: 200 })
    const eea = row({ id: 'eea:1', source: 'eea', cycle: 'WLTP', co2GKm: 130 })
    expect(selectFuelEstimate([epa, eea], { year: 2020 })).toMatchObject({ source: 'eea', cycle: 'WLTP', matches: 1 })
    expect(selectFuelEstimate([epa, { ...eea, modelYear: 2018 }], { year: 2020 })?.source).toBe('epa')
  })

  it('returns null when nothing matches', () => {
    expect(selectFuelEstimate([], { year: 2020 })).toBeNull()
  })
})

describe('matchModelRows', () => {
  const rows = [
    row({ id: 'a', modelKey: 'camry' }),
    row({ id: 'b', modelKey: 'camryhybridle' }),
    row({ id: 'c', modelKey: 'landcruiser' }),
    row({ id: 'd', modelKey: 'land' })
  ]

  it('takes reference models that extend the registry model', () => {
    expect(matchModelRows(rows, 'camry').map(r => r.id)).toEqual(['a', 'b'])
  })

  it('falls back to the longest reference model the registry model starts with', () => {
    expect(matchModelRows(rows, 'landcruiser200').map(r => r.id)).toEqual(['c'])
  })
})

describe('registryFuelClass', () => {
  it('buckets the registry fuel text', () => {
    expect(registryFuelClass('БЕНЗИН')).toBe('petrol')
    expect(registryFuelClass('ДИЗЕЛЬНЕ ПАЛИВО')).toBe('diesel')
    expect(registryFuelClass('ЕЛЕКТРО')).toBe('electric')
    expect(registryFuelClass('ЕЛЕКТРО АБО БЕНЗИН')).toBe('hybrid')
    expect(registryFuelClass('БЕНЗИН АБО ГАЗ')).toBe('petrol')
    expect(registryFuelClass(null)).toBe('unknown')
  })
})
