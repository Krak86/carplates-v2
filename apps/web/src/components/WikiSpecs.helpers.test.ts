import { describe, it, expect } from 'vitest'

import {
  formatDimension,
  formatEngine,
  formatEnginePower,
  splitWikiCodes,
  wikiSourceLabel
} from '@/components/WikiSpecs.helpers'

const UNITS: Record<string, string> = {
  'rdw.unitKw': 'kW',
  'rdw.unitHp': 'hp',
  'rdw.unitM': 'm',
  'field.unitL': 'L',
  'field.unitKg': 'kg',
  'field.unitT': 't',
  'wikispec.unitMm': 'mm',
  'wikispec.fuel.petrol': 'petrol'
}
const t = (key: string, options?: Record<string, unknown>): string => UNITS[key] ?? String(options?.defaultValue ?? key)

describe('wikiSourceLabel', () => {
  it('upper-cases the edition and maps uk to UA', () => {
    expect(wikiSourceLabel({ lang: 'ru' })).toBe('Wikipedia (RU)')
    expect(wikiSourceLabel({ lang: 'uk' })).toBe('Wikipedia (UA)')
  })
})

describe('formatEnginePower', () => {
  it('shows kW with the horsepower in brackets', () => {
    expect(formatEnginePower({ powerKw: 74 }, t)).toBe('74 kW (101 hp)')
  })
  it('shows a range, and ignores a max that is not above the min', () => {
    expect(formatEnginePower({ powerKw: 150, powerKwMax: 153 }, t)).toBe('150–153 kW (204–208 hp)')
    expect(formatEnginePower({ powerKw: 150, powerKwMax: 150 }, t)).toBe('150 kW (204 hp)')
  })
  it('is null without power', () => {
    expect(formatEnginePower({ powerKw: null }, t)).toBeNull()
  })
})

describe('formatEngine', () => {
  it('joins displacement, fuel and power', () => {
    expect(formatEngine({ displacementCc: 1300, fuel: 'petrol', powerKw: 74 }, t)).toBe(
      '1.3 L · petrol · 74 kW (101 hp)'
    )
  })
  it('falls back to the raw text when nothing was parsed', () => {
    expect(formatEngine({ raw: '1.8 i-VTEC' }, t)).toBe('1.8 i-VTEC')
  })
})

describe('formatDimension', () => {
  it('formats millimetres with metres, kilograms with tonnes, litres plain', () => {
    const dims = { wheelbaseMm: 2700, kerbKg: 1240, fuelTankL: 50 }
    expect(formatDimension('wheelbaseMm', dims, t, 'en')).toBe('2,700 mm (~2.7 m)')
    expect(formatDimension('kerbKg', dims, t, 'en')).toBe('1,240 kg (~1.24 t)')
    expect(formatDimension('fuelTankL', dims, t, 'en')).toBe('50 L')
    expect(formatDimension('lengthMm', dims, t, 'en')).toBeNull()
  })
})

describe('splitWikiCodes', () => {
  it('tells engine codes from chassis codes by shape', () => {
    expect(splitWikiCodes(['T24A-FTS', 'TJA250'])).toEqual({ engine: ['T24A-FTS'], chassis: ['TJA250'] })
    expect(splitWikiCodes(['2TR-FE', 'FK1', 'L13Z4'])).toEqual({ engine: ['2TR-FE', 'L13Z4'], chassis: ['FK1'] })
    expect(splitWikiCodes(null)).toEqual({ engine: [], chassis: [] })
  })
})
