import { describe, expect, it } from 'vitest'

import { looksLikeHeader, mapRecord, toInt, toIsoDate, toStr } from './transform.js'

describe('toIsoDate', () => {
  it('flips DD.MM.YYYY to ISO', () => {
    expect(toIsoDate('11.05.2018')).toBe('2018-05-11')
  })
  it('returns null for anything else', () => {
    expect(toIsoDate('2018-05-11')).toBeNull()
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

const row19 = [
  'P',
  '4823355100',
  '100',
  'ПЕРВИННА РЕЄСТРАЦIЯ',
  '11.05.2018',
  '1234',
  'ТСЦ 1234',
  'TOYOTA',
  'CAMRY',
  '2018',
  'ЧОРНИЙ',
  'ЛЕГКОВИЙ',
  'СЕДАН',
  'ЗАГАЛЬНИЙ',
  'БЕНЗИН',
  '2494',
  '1490',
  '1990',
  'ВЕ7116АА'
]
const row20 = [
  'P',
  '4823355100',
  '100',
  'ПЕРВИННА РЕЄСТРАЦIЯ',
  '11.05.2018',
  '1234',
  'ТСЦ 1234',
  'TOYOTA',
  'CAMRY',
  '4T1BF1FK5CU000001',
  '2018',
  'ЧОРНИЙ',
  'ЛЕГКОВИЙ',
  'СЕДАН',
  'ЗАГАЛЬНИЙ',
  'БЕНЗИН',
  '2494',
  '1490',
  '1990',
  'be 7116 aa'
]

describe('mapRecord', () => {
  it('reads the 19-column (no VIN) layout', () => {
    const r = mapRecord(row19, 'res-1')
    expect(r?.plate).toBe('ВЕ7116АА')
    expect(r?.vin).toBeNull()
    expect(r?.brand).toBe('TOYOTA')
    expect(r?.dReg).toBe('2018-05-11')
    expect(r?.capacity).toBe(2494)
  })

  it('reads the 20-column (VIN after model) layout and normalizes the plate', () => {
    const r = mapRecord(row20, 'res-1')
    expect(r?.plate).toBe('ВЕ7116АА')
    expect(r?.vin).toBe('4T1BF1FK5CU000001')
    expect(r?.model).toBe('CAMRY')
    expect(r?.makeYear).toBe(2018)
  })

  it('skips rows with an empty plate', () => {
    expect(mapRecord([...row19.slice(0, 18), ''], 'res-1')).toBeNull()
  })
})

describe('looksLikeHeader', () => {
  it('detects a header vs a data row by the oper_code column', () => {
    expect(looksLikeHeader(['person', 'koatuu', 'oper_code', 'x'])).toBe(true)
    expect(looksLikeHeader(row19)).toBe(false)
  })
})
