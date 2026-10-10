import { describe, it, expect } from 'vitest'

import { componentHead, componentKey, hasComponentDetail } from './NhtsaRecalls.helpers'

describe('componentKey', () => {
  it('maps the head of a detailed label', () => {
    expect(componentKey('AIR BAGS:FRONTAL:DRIVER SIDE:INFLATOR MODULE')).toBe('nhtsa.comp.airBags')
    expect(componentKey('FUEL SYSTEM, GASOLINE:DELIVERY:HOSES, LINES/PIPING, AND FITTINGS')).toBe(
      'nhtsa.comp.fuelGasoline'
    )
  })
  it('is case-insensitive and null for unknown wording', () => {
    expect(componentKey('Steering')).toBe('nhtsa.comp.steering')
    expect(componentKey('Carry Handle')).toBeNull()
  })
})

describe('componentHead / hasComponentDetail', () => {
  it('splits on the first colon', () => {
    expect(componentHead('STEERING:ELECTRIC POWER ASSIST SYSTEM')).toBe('STEERING')
    expect(hasComponentDetail('STEERING:ELECTRIC POWER ASSIST SYSTEM')).toBe(true)
    expect(hasComponentDetail('STEERING')).toBe(false)
  })
})
