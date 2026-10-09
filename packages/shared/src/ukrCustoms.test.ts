import { describe, it, expect } from 'vitest'

import { customsAgeK, customsFuel, customsTax } from './ukrCustoms.js'

describe('customsFuel', () => {
  it('maps registry fuel text to a customs class', () => {
    expect(customsFuel('ДИЗЕЛЬНЕ ПАЛИВО')).toBe('diesel')
    expect(customsFuel('БЕНЗИН')).toBe('petrol')
    expect(customsFuel('ЕЛЕКТРО')).toBe('electric')
    expect(customsFuel('ЕЛЕКТРО АБО БЕНЗИН')).toBe('petrol')
    expect(customsFuel('БЕНЗИН ГАЗ')).toBe('petrol')
  })

  it('is null for unknown or absent fuel', () => {
    expect(customsFuel('НЕ ВИЗНАЧЕНО')).toBeNull()
    expect(customsFuel(null)).toBeNull()
    expect(customsFuel('ВОДЕНЬ')).toBeNull()
  })
})

describe('customsAgeK', () => {
  it('counts full years after the production year, clamped to 1..15', () => {
    expect(customsAgeK(2012, 2026)).toBe(13)
    expect(customsAgeK(2025, 2026)).toBe(1)
    expect(customsAgeK(2026, 2026)).toBe(1)
    expect(customsAgeK(1990, 2026)).toBe(15)
  })
})

describe('customsTax', () => {
  it('adds duty, excise and VAT for a diesel Octavia 2012 (1598 cc)', () => {
    const t = customsTax({ baseEur: 2200, fuel: 'diesel', capacityCc: 1598, makeYear: 2012, nowYear: 2026 })
    expect(t.ageK).toBe(13)
    expect(t.dutyEur).toBeCloseTo(220)
    expect(t.exciseEur).toBeCloseTo(75 * 1.598 * 13)
    expect(t.vatEur).toBeCloseTo((2200 + 220 + t.exciseEur) * 0.2)
    expect(t.totalEur).toBeCloseTo(2200 + t.taxEur)
    expect(t.exciseKnown).toBe(true)
  })

  it('uses the higher base rate over the engine-size threshold', () => {
    const petrol = customsTax({ baseEur: 1000, fuel: 'petrol', capacityCc: 3500, makeYear: 2020, nowYear: 2026 })
    expect(petrol.exciseEur).toBeCloseTo(100 * 3.5 * 5)
    const diesel = customsTax({ baseEur: 1000, fuel: 'diesel', capacityCc: 3600, makeYear: 2020, nowYear: 2026 })
    expect(diesel.exciseEur).toBeCloseTo(150 * 3.6 * 5)
  })

  it('charges only VAT on an electric car and flags the missing battery excise', () => {
    const t = customsTax({ baseEur: 20000, fuel: 'electric', capacityCc: null, makeYear: 2021, nowYear: 2026 })
    expect(t.dutyEur).toBe(0)
    expect(t.exciseEur).toBe(0)
    expect(t.vatEur).toBeCloseTo(4000)
    expect(t.exciseKnown).toBe(false)
  })

  it('flags an unknown excise when fuel or capacity is missing', () => {
    expect(customsTax({ baseEur: 1000, fuel: null, capacityCc: 1600, makeYear: 2015, nowYear: 2026 }).exciseKnown).toBe(
      false
    )
    expect(
      customsTax({ baseEur: 1000, fuel: 'petrol', capacityCc: null, makeYear: 2015, nowYear: 2026 }).exciseKnown
    ).toBe(false)
  })
})
