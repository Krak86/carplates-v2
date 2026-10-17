import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  isPlaceholderIdent,
  monthSlug,
  parseCardDate,
  parseDetailRecords,
  parseLongDate,
  parseMonthCards,
  parseMonthSlug
} from './wanted-history-parse.js'

const fixture = (name: string): string => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

describe('stolen.in.ua dates and slugs', () => {
  it('parses card and long dates', () => {
    expect(parseCardDate('1 серп.', 2020)).toBe('2020-08-01')
    expect(parseCardDate('15 жовт.', 2022)).toBe('2022-10-15')
    expect(parseLongDate('30 квітня 2026 р.')).toBe('2026-04-30')
    expect(parseLongDate('Невідомо')).toBeNull()
  })

  it('maps month slugs both ways', () => {
    expect(parseMonthSlug('aug-20')).toEqual({ year: 2020, month: 8 })
    expect(parseMonthSlug('xxx-20')).toBeNull()
    expect(monthSlug(2026, 1)).toBe('jan-26')
  })

  it('recognises placeholder ids', () => {
    for (const id of ['XXXXXXXX', '0000', '*', 'AB1']) expect(isPlaceholderIdent(id)).toBe(true)
    expect(isPlaceholderIdent('AP1577BP')).toBe(false)
  })
})

describe('stolen.in.ua month page', () => {
  const cards = parseMonthCards(fixture('stolen-month-aug-20.html'), 2020)

  it('reads found and wanted cards', () => {
    expect(cards.length).toBeGreaterThanOrEqual(5)
    expect(cards[0]).toEqual({
      ident: '15542AM',
      found: false,
      vehicleType: 'Трактор',
      brand: 'DONGFENG',
      model: '244DH',
      seizedAt: '2020-08-01'
    })
    expect(cards.some(c => c.found)).toBe(true)
    expect(cards.some(c => c.ident === 'XXXXXXXX')).toBe(true)
  })
})

describe('stolen.in.ua detail page', () => {
  const records = parseDetailRecords(fixture('stolen-detail-AP1577BP.html'))

  it('reads the current and the removed record', () => {
    expect(records).toHaveLength(2)
    expect(records[0]).toMatchObject({
      current: true,
      brand: 'HONDA',
      model: 'CR V',
      vehicleType: 'Легковий автотранспорт',
      color: 'ЧОРНИЙ',
      plate: 'AP1577BP',
      bodyNumber: 'SHSRE7870CU000507',
      chassisNumber: null,
      seizedAt: '2020-08-01',
      registeredAt: '2020-08-01',
      resolvedAt: null
    })
    expect(records[0]!.organUnit).toContain('ЗАПОРІЗЬКОГО')
    expect(records[1]).toMatchObject({ current: false, seizedAt: '2020-08-01', resolvedAt: '2026-04-30' })
    expect(records[1]!.organUnit).toContain('КОМУНАРСЬКЕ')
  })
})
