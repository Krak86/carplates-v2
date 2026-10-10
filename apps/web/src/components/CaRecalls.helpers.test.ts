import { describe, it, expect } from 'vitest'

import { caRecallUrl, systemKey } from './CaRecalls.helpers'

describe('systemKey', () => {
  it('maps a known label case-insensitively', () => {
    expect(systemKey('Seats And Restraints')).toBe('ca.sys.seats')
    expect(systemKey('brakes')).toBe('ca.sys.brakes')
    expect(systemKey('Fuel System')).toBe('ca.sys.fuel')
  })
  it('is null for wording we do not know', () => {
    expect(systemKey('Flux Capacitor')).toBeNull()
  })
})

describe('caRecallUrl', () => {
  it('points at the recall detail page', () => {
    expect(caRecallUrl('2019090')).toContain('detail.aspx?lang=eng&rn=2019090')
  })
})
