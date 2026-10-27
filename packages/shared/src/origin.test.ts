import { describe, expect, it } from 'vitest'
import { countryAtYear, isLegacyCountry } from './origin.js'

describe('countryAtYear', () => {
  it('maps Czech and Slovak places to Czechoslovakia up to 1992', () => {
    expect(countryAtYear('CZ', 1985)).toBe('CSHH')
    expect(countryAtYear('CZ', 1995)).toBe('CZ')
    expect(countryAtYear('SK', 1990)).toBe('CSHH')
    expect(countryAtYear('SK', 1992)).toBe('CSHH')
    expect(countryAtYear('SK', 1995)).toBe('SK')
  })

  it('maps Germany to the FRG, or the GDR when east, before reunification', () => {
    expect(countryAtYear('DE', 1985)).toBe('DE-FRG')
    expect(countryAtYear('DE', 1985, { east: true })).toBe('DD')
    expect(countryAtYear('DE', 1990)).toBe('DE')
    expect(countryAtYear('DE', 1995)).toBe('DE')
    expect(countryAtYear('DE', 1995, { east: true })).toBe('DE')
  })

  it('maps Soviet republics to the USSR up to 1991', () => {
    expect(countryAtYear('UA', 1980)).toBe('SU')
    expect(countryAtYear('RU', 1991)).toBe('SU')
    expect(countryAtYear('UA', 1992)).toBe('UA')
  })

  it('walks Yugoslavia, Serbia and Montenegro', () => {
    expect(countryAtYear('HR', 1985)).toBe('YU')
    expect(countryAtYear('HR', 1995)).toBe('HR')
    expect(countryAtYear('RS', 1999)).toBe('YU')
    expect(countryAtYear('RS', 2004)).toBe('CSXX')
    expect(countryAtYear('RS', 2010)).toBe('RS')
  })

  it('leaves unaffected countries, unknown years and legacy codes alone', () => {
    expect(countryAtYear('JP', 1950)).toBe('JP')
    expect(countryAtYear('DE', null)).toBe('DE')
    expect(countryAtYear('SU', 2020)).toBe('SU')
  })
})

describe('isLegacyCountry', () => {
  it('knows the former states only', () => {
    expect(isLegacyCountry('DE-FRG')).toBe(true)
    expect(isLegacyCountry('DE')).toBe(false)
  })
})
