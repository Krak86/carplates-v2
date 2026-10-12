import { describe, it, expect } from 'vitest'

import {
  engineMatchesCar,
  engineRows,
  engineVsCar,
  formatDimension,
  formatEngine,
  formatEnginePower,
  generationYearOf,
  sortEnginesByFit,
  splitWikiCodes,
  wikiRowCodes,
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
    expect(wikiSourceLabel({ lang: 'ru', title: 'x' })).toBe('Wikipedia (RU)')
    expect(wikiSourceLabel({ lang: 'uk', title: 'x' })).toBe('Wikipedia (UA)')
  })
  it('names the cited site for a curated source, never Wikipedia', () => {
    expect(wikiSourceLabel({ lang: 'curated', title: 'Bajaj Auto' })).toBe('Bajaj Auto')
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

  it('files known engine families as engines and drops bare displacements (real rows of the 2026-10 ingest)', () => {
    expect(splitWikiCodes(['B48', 'TU5', 'XUD9', 'DV6', 'EA888', 'M274'])).toEqual({
      engine: ['B48', 'TU5', 'XUD9', 'DV6', 'EA888', 'M274'],
      chassis: []
    })
    expect(splitWikiCodes(['1798', 'XV40', 'ACV31'])).toEqual({ engine: [], chassis: ['XV40', 'ACV31'] })
  })

  it('drops gearbox words that old rows still carry', () => {
    expect(splitWikiCodes(['3-phase', '4-speed', '5-speed', '6-speed', 'XV40'])).toEqual({
      engine: [],
      chassis: ['XV40']
    })
  })
})

describe('wikiRowCodes', () => {
  it('trusts the stored split, even where the shape guess would misfile', () => {
    expect(wikiRowCodes({ engineCodes: ['GSE20'], chassisCodes: ['ALE20'] })).toEqual({
      engine: ['GSE20'],
      chassis: ['ALE20']
    })
    expect(wikiRowCodes({ engineCodes: [], chassisCodes: ['B48'] })).toEqual({ engine: [], chassis: ['B48'] })
    expect(wikiRowCodes({ engineCodes: ['CJZA'] })).toEqual({ engine: ['CJZA'], chassis: [] })
  })

  it('falls back to the shape guess for old rows without engineCodes', () => {
    expect(wikiRowCodes({ chassisCodes: ['2TR-FE', 'FK1'] })).toEqual({ engine: ['2TR-FE'], chassis: ['FK1'] })
    expect(wikiRowCodes({ chassisCodes: ['2TR-FE', 'FK1'], engineCodes: null })).toEqual({
      engine: ['2TR-FE'],
      chassis: ['FK1']
    })
    expect(wikiRowCodes({})).toEqual({ engine: [], chassis: [] })
  })
})

describe('engineRows codes', () => {
  const t = (key: string): string => key
  it('shows the stored codes under their own rows', () => {
    const rows = engineRows({ raw: '', powerKw: 100, engineCodes: ['GSE20'], chassisCodes: ['ALE20'] }, t)
    expect(rows.find(r => r.key === 'engineCode')?.value).toBe('GSE20')
    expect(rows.find(r => r.key === 'chassisCode')?.value).toBe('ALE20')
  })
})

describe('engineMatchesCar', () => {
  const petrol16 = { displacementCc: 1598, powerKw: 77, fuel: 'petrol' }
  const car = { fuel: 'БЕНЗИН', displacementCc: 1597, powerKw: 77 }

  it('matches on fuel, displacement and power', () => {
    expect(engineMatchesCar(petrol16, car)).toBe(true)
    expect(engineMatchesCar({ ...petrol16, powerKw: 66, powerKwMax: 80 }, car)).toBe(true)
  })

  it('rejects another fuel, size or power', () => {
    expect(engineMatchesCar({ ...petrol16, fuel: 'diesel' }, car)).toBe(false)
    expect(engineMatchesCar({ ...petrol16, displacementCc: 1998 }, car)).toBe(false)
    expect(engineMatchesCar({ ...petrol16, powerKw: 110 }, car)).toBe(false)
  })

  it('never matches on fuel alone or without registry data', () => {
    expect(engineMatchesCar({ fuel: 'petrol' }, car)).toBe(false)
    expect(engineMatchesCar(petrol16, undefined)).toBe(false)
    expect(engineMatchesCar(petrol16, { fuel: 'БЕНЗИН' })).toBe(false)
  })

  it('lets a hybrid engine fit a petrol or electric registration', () => {
    expect(engineMatchesCar({ ...petrol16, fuel: 'hybrid' }, { ...car, fuel: 'ЕЛЕКТРО АБО БЕНЗИН' })).toBe(true)
  })
})

describe('engineVsCar', () => {
  const car = { displacementCc: 1600, powerKw: 77 }

  it('shows signed litre and kW differences', () => {
    expect(engineVsCar({ displacementCc: 2000, powerKw: 110 }, car, t)).toBe('+0.4 L · +33 kW')
    expect(engineVsCar({ displacementCc: 1400, powerKw: 59 }, car, t)).toBe('−0.2 L · −18 kW')
  })

  it('is null when nothing is comparable or nothing differs', () => {
    expect(engineVsCar({ fuel: 'petrol' }, car, t)).toBeNull()
    expect(engineVsCar({ displacementCc: 1600, powerKw: 77 }, car, t)).toBeNull()
    expect(engineVsCar({ displacementCc: 2000 }, undefined, t)).toBeNull()
  })
})

describe('sortEnginesByFit', () => {
  it('puts the matching engine first and keeps the rest in order', () => {
    const a = { displacementCc: 1400, powerKw: 59, fuel: 'petrol' }
    const b = { displacementCc: 1600, powerKw: 77, fuel: 'petrol' }
    const c = { displacementCc: 2000, powerKw: 110, fuel: 'petrol' }
    expect(sortEnginesByFit([a, b, c], { fuel: 'БЕНЗИН', displacementCc: 1600, powerKw: 77 })).toEqual([b, a, c])
  })
})

describe('generationYearOf', () => {
  it('counts the year inside the generation', () => {
    expect(generationYearOf(2008, 2006, 2011)).toEqual({ n: 3, total: 6 })
    expect(generationYearOf(2020, 2018, null)).toEqual({ n: 3, total: null })
    expect(generationYearOf(2015, 2018, null)).toBeNull()
    expect(generationYearOf(null, 2018, null)).toBeNull()
  })
})
