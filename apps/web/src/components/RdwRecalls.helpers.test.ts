import { describe, it, expect } from 'vitest'

import { categoryKey, formatOpenShare, formatRecallDate, formatVehicleCount, hazardKey } from './RdwRecalls.helpers'

describe('formatRecallDate', () => {
  it('formats an ISO date in UTC', () => expect(formatRecallDate('2025-07-09', 'en')).toBe('July 9, 2025'))
  it('passes through junk and nulls', () => {
    expect(formatRecallDate('soon', 'en')).toBe('soon')
    expect(formatRecallDate(null, 'en')).toBeNull()
  })
})

describe('formatOpenShare', () => {
  it('rounds and guards the edges', () => {
    expect(formatOpenShare(0.123)).toBe('12 %')
    expect(formatOpenShare(0.004)).toBe('<1 %')
    expect(formatOpenShare(0)).toBe('0 %')
    expect(formatOpenShare(null)).toBeNull()
  })
})

describe('formatVehicleCount', () => {
  it('hides missing and zero counts', () => {
    expect(formatVehicleCount(0, 'en')).toBeNull()
    expect(formatVehicleCount(null, 'en')).toBeNull()
    expect(formatVehicleCount(7500, 'en')).toBe('7,500')
  })
})

describe('categoryKey / hazardKey', () => {
  it('maps known RDW wording and leaves the rest alone', () => {
    expect(categoryKey('Motorrijtuigen en aanhangwagens - reminrichting')).toBe('recalls.cat.brakes')
    expect(hazardKey('Brand met letselschade')).toBe('recalls.hazard.fire')
    expect(categoryKey('Iets nieuws')).toBeNull()
    expect(hazardKey('Iets nieuws')).toBeNull()
  })
})
