import { describe, expect, it } from 'vitest'
import {
  buildCustomsQuery,
  calcImportCosts,
  CUSTOMS_PRESETS,
  importAgeK,
  mapFuel,
  parseCustomsQuery,
  pickCustomsRules,
  UA_IMPORT_2026_1
} from './customs.js'

const base = { nowYear: 2026, eurUah: 50.6796 }

describe('calcImportCosts fixtures', () => {
  it('petrol 1600 cm3, 2020, 10000 EUR', () => {
    const r = calcImportCosts({ ...base, fuel: 'petrol', valueEur: 10000, cc: 1600, year: 2020 })
    expect(r.ageK).toBe(6)
    expect(r.dutyEur).toBe(1000)
    expect(r.exciseEur).toBe(480)
    expect(r.vatEur).toBe(2296)
    expect(r.pensionRate).toBe(0.03)
    expect(r.pensionUah).toBe(15203.88)
    expect(r.missing).toEqual([])
    expect(r.estimate).toBe(false)
  })

  it('diesel 2000 cm3, 2018, 12000 EUR (pension 4 %)', () => {
    const r = calcImportCosts({ ...base, fuel: 'diesel', valueEur: 12000, cc: 2000, year: 2018 })
    expect(r.dutyEur).toBe(1200)
    expect(r.exciseEur).toBe(1200)
    expect(r.vatEur).toBe(2880)
    expect(r.pensionRate).toBe(0.04)
    expect(r.pensionUah).toBe(24326.21)
  })

  it('EV 60 kWh, 15000 EUR: no duty, excise 1 EUR/kWh, VAT, no pension fee', () => {
    const r = calcImportCosts({ ...base, fuel: 'ev', valueEur: 15000, kwh: 60, year: 2024 })
    expect(r.dutyEur).toBe(0)
    expect(r.exciseEur).toBe(60)
    expect(r.vatEur).toBe(3012)
    expect(r.pensionUah).toBe(0)
  })

  it('the presets match the fixtures', () => {
    const [petrol, diesel, ev] = CUSTOMS_PRESETS.map(p =>
      calcImportCosts({
        ...base,
        fuel: p.fuel,
        valueEur: p.value,
        cc: 'cc' in p ? p.cc : null,
        kwh: 'kwh' in p ? p.kwh : null,
        year: p.year
      })
    )
    expect([petrol!.exciseEur, diesel!.exciseEur, ev!.exciseEur]).toEqual([480, 1200, 60])
  })
})

describe('calcImportCosts rules', () => {
  it('a base above the threshold uses the higher rate for the whole volume', () => {
    const at = calcImportCosts({ ...base, fuel: 'petrol', valueEur: 1000, cc: 3000, year: 2025 })
    const over = calcImportCosts({ ...base, fuel: 'petrol', valueEur: 1000, cc: 3001, year: 2025 })
    expect(at.exciseEur).toBe(150)
    expect(over.exciseEur).toBe(300.1)
    const dAt = calcImportCosts({ ...base, fuel: 'diesel', valueEur: 1000, cc: 3500, year: 2025 })
    const dOver = calcImportCosts({ ...base, fuel: 'diesel', valueEur: 1000, cc: 3501, year: 2025 })
    expect(dAt.exciseEur).toBe(262.5)
    expect(dOver.exciseEur).toBe(525.15)
  })

  it('EUR.1 and a duty override change the duty only', () => {
    const eur1 = calcImportCosts({ ...base, fuel: 'petrol', valueEur: 10000, cc: 1600, year: 2020, eur1: true })
    expect(eur1.dutyEur).toBe(0)
    expect(eur1.exciseEur).toBe(480)
    const custom = calcImportCosts({ ...base, fuel: 'petrol', valueEur: 10000, cc: 1600, year: 2020, dutyRate: 0.05 })
    expect(custom.dutyEur).toBe(500)
  })

  it('pension tiers include their upper bound', () => {
    const rate = (valueUah: number) =>
      calcImportCosts({ ...base, eurUah: 1, fuel: 'petrol', valueEur: valueUah, cc: 1000, year: 2020 }).pensionRate
    expect(rate(165 * 3328)).toBe(0.03)
    expect(rate(165 * 3328 + 1)).toBe(0.04)
    expect(rate(290 * 3328)).toBe(0.04)
    expect(rate(290 * 3328 + 1)).toBe(0.05)
  })

  it('reports what the excise is missing instead of guessing', () => {
    expect(calcImportCosts({ ...base, fuel: 'petrol', valueEur: 5000, year: 2020 }).missing).toEqual(['cc'])
    expect(calcImportCosts({ ...base, fuel: 'ev', valueEur: 5000, year: 2020 }).missing).toEqual(['kwh'])
  })

  it('hybrids are charged by their engine and flagged as an estimate', () => {
    const r = calcImportCosts({ ...base, fuel: 'hybrid', valueEur: 10000, cc: 1600, year: 2020 })
    expect(r.exciseEur).toBe(480)
    expect(r.estimate).toBe(true)
  })

  it('age coefficient: no minus one, min 1, max 15', () => {
    expect(importAgeK(2020, 2026)).toBe(6)
    expect(importAgeK(2026, 2026)).toBe(1)
    expect(importAgeK(2025, 2026)).toBe(1)
    expect(importAgeK(2027, 2026)).toBe(1)
    expect(importAgeK(2000, 2026)).toBe(15)
  })

  it('picks the rules by date', () => {
    expect(pickCustomsRules('2026-11-01')).toBe(UA_IMPORT_2026_1)
    expect(pickCustomsRules('2026-12-31')).toBe(UA_IMPORT_2026_1)
    expect(pickCustomsRules('2027-01-01')).toBeNull()
  })
})

describe('parseCustomsQuery', () => {
  it('parses a full link', () => {
    const { query, hasParams } = parseCustomsQuery(
      new URLSearchParams('fuel=Diesel&value=12000&cc=2000&year=2018&kwh=0&duty=5&eur1=1')
    )
    expect(hasParams).toBe(true)
    expect(query).toEqual({ fuel: 'diesel', value: 12000, cc: 2000, year: 2018, duty: 5, eur1: true })
  })

  it('drops bad fields and keeps the good ones', () => {
    const { query } = parseCustomsQuery(new URLSearchParams('fuel=lpg&value=abc&cc=1600&year=1&eur1=0'))
    expect(query).toEqual({ cc: 1600 })
  })

  it('reports no params for an empty or unrelated query', () => {
    expect(parseCustomsQuery(new URLSearchParams('')).hasParams).toBe(false)
    expect(parseCustomsQuery(new URLSearchParams('utm=x')).hasParams).toBe(false)
  })

  it('builds a link that parses back', () => {
    const query = { fuel: 'petrol', value: 10000, cc: 1600, year: 2020, eur1: true } as const
    expect(parseCustomsQuery(new URLSearchParams(buildCustomsQuery(query))).query).toEqual(query)
  })
})

describe('mapFuel', () => {
  it.each([
    ['БЕНЗИН', 'petrol'],
    ['Gasoline', 'petrol'],
    ['бензин А-95', 'petrol'],
    ['ДИЗЕЛЬНЕ ПАЛИВО', 'diesel'],
    ['Diesel', 'diesel'],
    ['дизель', 'diesel'],
    ['ЕЛЕКТРО', 'ev'],
    ['Electric', 'ev'],
    ['електромобіль', 'ev'],
    ['ЕЛЕКТРО АБО БЕНЗИН', 'hybrid'],
    ['Gasoline/Electric', 'hybrid'],
    ['Plug-in Hybrid', 'hybrid'],
    ['гібрид', 'hybrid'],
    ['БЕНЗИН АБО ГАЗ', 'petrol']
  ])('%s -> %s', (text, fuel) => {
    expect(mapFuel(text)).toBe(fuel)
  })

  it.each(['ГАЗ', 'Hydrogen', 'БЕНЗИН, ДИЗЕЛЬ', 'НЕ ВИЗНАЧЕНО', '', '.', null, undefined])('%s -> null', text => {
    expect(mapFuel(text)).toBeNull()
  })
})
