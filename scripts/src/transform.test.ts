import { describe, expect, it } from 'vitest'

import { buildLayout, looksLikeHeader, mapRecord, toInt, toIsoDate, toStr } from './transform.js'

describe('toIsoDate', () => {
  it('flips DD.MM.YYYY to ISO (2019-2022 layout)', () => {
    expect(toIsoDate('11.05.2018')).toBe('2018-05-11')
  })
  it('expands DD.MM.YY to ISO (2023-2026 layout)', () => {
    expect(toIsoDate('01.01.25')).toBe('2025-01-01')
  })
  it('passes ISO YYYY-MM-DD through unchanged (2013-2018 layout)', () => {
    expect(toIsoDate('2013-04-12')).toBe('2013-04-12')
  })
  it('returns null for anything else', () => {
    expect(toIsoDate('not a date')).toBeNull()
    expect(toIsoDate('')).toBeNull()
  })
})

describe('toInt / toStr', () => {
  it('parses or nulls', () => {
    expect(toInt('2494')).toBe(2494)
    expect(toInt('')).toBeNull()
    expect(toInt(undefined)).toBeNull()
    expect(toStr('  x ')).toBe('x')
    expect(toStr('')).toBeNull()
  })
})

// Real header/data shapes verified against data.gov.ua's reestrTZ resources.

/** 2013-2019: 19 columns, no VIN, lowercase unquoted header, ISO dates, redundant oper_name prefix. */
const HEADER_2013 = [
  'person',
  'reg_addr_koatuu',
  'oper_code',
  'oper_name',
  'd_reg',
  'dep_code',
  'dep',
  'brand',
  'model',
  'make_year',
  'color',
  'kind',
  'body',
  'purpose',
  'fuel',
  'capacity',
  'own_weight',
  'total_weight',
  'n_reg_new'
]
const ROW_2013 = [
  'P',
  '0510137000',
  '40',
  '40 - ВТОРИННА РЕЄСТРАЦІЯ',
  '2013-04-12',
  '1234',
  'ТСЦ 1234',
  'BMW',
  '320',
  '2013',
  'СИНІЙ',
  'ЛЕГКОВИЙ',
  'СЕДАН',
  'ЗАГАЛЬНИЙ',
  'БЕНЗИН',
  '1998',
  '1350',
  '1800',
  'КА0001АА'
]

/** 2021-2025: 20 columns (VIN after model), quoted header, DD.MM.YY dates from 2023 on. */
const HEADER_2025 = [
  'PERSON',
  'REG_ADDR_KOATUU',
  'OPER_CODE',
  'OPER_NAME',
  'D_REG',
  'DEP_CODE',
  'DEP',
  'BRAND',
  'MODEL',
  'VIN',
  'MAKE_YEAR',
  'COLOR',
  'KIND',
  'BODY',
  'PURPOSE',
  'FUEL',
  'CAPACITY',
  'OWN_WEIGHT',
  'TOTAL_WEIGHT',
  'N_REG_NEW'
]
const ROW_2025 = [
  'P',
  '6310138200',
  '254',
  'НАЛЕЖНИЙ КОРИСТУВАЧ. РЕЄСТРАЦІЯ',
  '01.01.25',
  '10000',
  'OLD_ДДАІ МВС УКРАЇНИ',
  'LEXUS',
  'IS 250',
  'JTHCK262882026114',
  '2008',
  'ЧЕРВОНИЙ',
  'ЛЕГКОВИЙ',
  'СЕДАН',
  'ЗАГАЛЬНИЙ',
  'БЕНЗИН',
  '2499',
  '2075',
  '2575',
  'АХ1312КК'
]

/** 2026: 17 columns, no plate, fused oper column, KIND;PURPOSE;BODY order (not 2025's KIND;BODY;PURPOSE). */
const HEADER_2026 = [
  'PERSON',
  "CD.OPER_CODE||'-'||CD.OPERAS",
  'D_REG',
  'DEP',
  'BRAND',
  'MODEL',
  'VIN',
  'MAKE_YEAR',
  'COLOR',
  'KIND',
  'PURPOSE',
  'BODY',
  'FUEL',
  'CAPACITY',
  'POWER_KWT',
  'OWN_WEIGHT',
  'TOTAL_WEIGHT'
]
const ROW_2026 = [
  'P',
  '50 - ВТОРИННА РЕЄСТРАЦІЯ ТЗ ЗНЯТОГО З ОБЛІКУ НА НОВОГО ВЛАСНИКА ЗА ДКП УКЛАДЕНОМУ В СГ (TRADE-IN)',
  '01.01.26',
  'ТСЦ 5141',
  'BMW',
  'X6',
  'WBAKV210300R24692',
  '2015',
  'БІЛИЙ',
  'ЛЕГКОВИЙ',
  'ЗАГАЛЬНИЙ',
  'УНІВЕРСАЛ',
  'ДИЗЕЛЬНЕ ПАЛИВО',
  '2993',
  '',
  '2140',
  '3000'
]
const ROW_2026_WITH_POWER = [
  'P',
  '308 - ПЕРЕРЕЄСТРАЦІЯ НА НОВОГО ВЛАСНИКА',
  '01.01.26',
  'ТСЦ 0546',
  'OPEL',
  'INSIGNIA',
  'W0LGT5GM2C1097615',
  '2012',
  'СІРИЙ',
  'ЛЕГКОВИЙ',
  'ЗАГАЛЬНИЙ',
  'СЕДАН',
  'ДИЗЕЛЬНЕ ПАЛИВО',
  '1956',
  '162',
  '1800',
  '2490'
]

describe('looksLikeHeader', () => {
  it('recognizes every real header shape', () => {
    expect(looksLikeHeader(HEADER_2013)).toBe(true)
    expect(looksLikeHeader(HEADER_2025)).toBe(true)
    expect(looksLikeHeader(HEADER_2026)).toBe(true)
    expect(looksLikeHeader(['person', 'koatuu', 'oper_code', 'x'])).toBe(true)
  })

  it('rejects a data row', () => {
    expect(looksLikeHeader(ROW_2013)).toBe(false)
    expect(looksLikeHeader(ROW_2026)).toBe(false)
  })
})

describe('buildLayout', () => {
  it('maps the 2013-2019 layout (no VIN, no fused oper column)', () => {
    const layout = buildLayout(HEADER_2013)
    expect(layout.columns.plate).toBe(18)
    expect(layout.columns.operCode).toBe(2)
    expect(layout.columns.operName).toBe(3)
    expect(layout.columns.vin).toBeUndefined()
    expect(layout.operCodeNameColumn).toBeUndefined()
  })

  it('maps the 2021-2025 layout (VIN present)', () => {
    const layout = buildLayout(HEADER_2025)
    expect(layout.columns.vin).toBe(9)
    expect(layout.columns.plate).toBe(19)
    expect(layout.operCodeNameColumn).toBeUndefined()
  })

  it('maps the 2026 layout (fused oper column, no plate column, power_kwt)', () => {
    const layout = buildLayout(HEADER_2026)
    expect(layout.operCodeNameColumn).toBe(1)
    expect(layout.columns.plate).toBeUndefined()
    expect(layout.columns.powerKwt).toBe(14)
    expect(layout.columns.kind).toBe(9)
    expect(layout.columns.purpose).toBe(10)
    expect(layout.columns.body).toBe(11)
  })

  it('throws on a header with no recognizable column', () => {
    expect(() => buildLayout(ROW_2013)).toThrow(/unrecognized CSV header/)
  })
})

describe('mapRecord', () => {
  it('reads the 2013-2019 layout, converts the ISO date, strips the redundant oper_name prefix', () => {
    const layout = buildLayout(HEADER_2013)
    const r = mapRecord(ROW_2013, layout, 'res-2013')
    expect(r?.plate).toBe('КА0001АА')
    expect(r?.vin).toBeNull()
    expect(r?.dReg).toBe('2013-04-12')
    expect(r?.operCode).toBe(40)
    expect(r?.operName).toBe('ВТОРИННА РЕЄСТРАЦІЯ')
    expect(r?.capacity).toBe(1998)
  })

  it('reads the 2021-2025 layout, converts a 2-digit year, and normalizes the plate', () => {
    const layout = buildLayout(HEADER_2025)
    const r = mapRecord(ROW_2025, layout, 'res-2025')
    expect(r?.plate).toBe('АХ1312КК')
    expect(r?.vin).toBe('JTHCK262882026114')
    expect(r?.dReg).toBe('2025-01-01')
    expect(r?.operCode).toBe(254)
    expect(r?.brand).toBe('LEXUS')
  })

  it('reads the 2026 layout: no plate, split fused oper column, body/purpose not swapped', () => {
    const layout = buildLayout(HEADER_2026)
    const r = mapRecord(ROW_2026, layout, 'res-2026')
    expect(r?.plate).toBeNull()
    expect(r?.vin).toBe('WBAKV210300R24692')
    expect(r?.dReg).toBe('2026-01-01')
    expect(r?.operCode).toBe(50)
    expect(r?.operName).toBe(
      'ВТОРИННА РЕЄСТРАЦІЯ ТЗ ЗНЯТОГО З ОБЛІКУ НА НОВОГО ВЛАСНИКА ЗА ДКП УКЛАДЕНОМУ В СГ (TRADE-IN)'
    )
    expect(r?.kind).toBe('ЛЕГКОВИЙ')
    expect(r?.purpose).toBe('ЗАГАЛЬНИЙ')
    expect(r?.body).toBe('УНІВЕРСАЛ')
    expect(r?.powerKwt).toBeNull()
  })

  it('reads power_kwt when present', () => {
    const layout = buildLayout(HEADER_2026)
    const r = mapRecord(ROW_2026_WITH_POWER, layout, 'res-2026')
    expect(r?.powerKwt).toBe(162)
    expect(r?.operCode).toBe(308)
  })

  it('skips a row with neither plate nor VIN', () => {
    const layout = buildLayout(HEADER_2013)
    const noIdentity = [...ROW_2013.slice(0, 18), '']
    expect(mapRecord(noIdentity, layout, 'res-1')).toBeNull()
  })
})
