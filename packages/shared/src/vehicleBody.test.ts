import { describe, expect, it } from 'vitest'

import { mergeBodyStats, normalizeBody, resolveBodyCategory } from './vehicleBody.js'

describe('normalizeBody', () => {
  it.each([
    ['КАБРІОЛЕТ-B', 'КАБРІОЛЕТ'],
    ['КАБРІОЛЕТ', 'КАБРІОЛЕТ'],
    ['  СЕДАН-B ', 'СЕДАН'],
    ['СЕДАН-В', 'СЕДАН'],
    ['ПР-БОРТОВИЙ-B', 'ПР-БОРТОВИЙ'],
    ['ПР-БОРТОВИЙ', 'ПР-БОРТОВИЙ'],
    ['Н/ПР-САМОСКИД', 'Н/ПР-САМОСКИД']
  ])('%s → %s', (body, expected) => {
    expect(normalizeBody(body)).toBe(expected)
  })

  it('returns null for empty input', () => {
    expect(normalizeBody(null)).toBeNull()
    expect(normalizeBody('')).toBeNull()
  })
})

describe('mergeBodyStats', () => {
  it('sums the "-B" row into the plain one and sorts by plates', () => {
    const row = (body: string | null, n: number) => ({ body, totalRows: n, distinctPlates: n, distinctVins: n })
    expect(mergeBodyStats([row('КАБРІОЛЕТ-B', 5), row('УНІВЕРСАЛ', 7), row('КАБРІОЛЕТ', 10), row(null, 1)])).toEqual([
      row('КАБРІОЛЕТ', 15),
      row('УНІВЕРСАЛ', 7),
      row(null, 1)
    ])
  })
})

describe('resolveBodyCategory', () => {
  it.each([
    ['МЕДДОПОМОГА', 'ambulance'],
    ['МІКРОАВТОБУС МЕДДОПОМ.', 'ambulance'],
    ['СПЕЦІАЛІЗОВАНИЙ МЕДДОПОМОГА', 'ambulance'],
    ['ПОЖЕЖНИЙ', 'fire'],
    ['ЦИСТЕРНА ПОЖЕЖНА', 'fire'],
    ['АВТОДРАБИНА ПОЖЕЖНА', 'fire'],
    ['ЦИСТЕРНА ХАРЧОВА', 'food'],
    ['Н/ПР-ЦИСТЕРНА Д/П НЕБЕЗ. ВАНТАЖ', 'dangerous'],
    ['Н/ПР-ПАЛИВОЦИСТЕРНА', 'tanker'],
    ['ФУРГОН (З ГІДРОБОРТОМ)', null],
    ['ФУРГОН РЕФРИЖЕРАТОР (З ГІДРОБОРТОМ)', 'refrigerated'],
    ['ПР-Д/П ЧОВНІВ', 'boatTrailer'],
    ['ЕСКАВАТОР-ПЛАНУВАЛЬНИК', 'excavator'],
    ['ПАРОГЕНЕРАТОРНА УСТАНОВКА', 'equipment'],
    ['ДЛЯ ПЕРЕВЕЗЕННЯ УВ’ЯЗНЕНИХ ОСІБ', 'armored'],
    ['Н/ПР-САМОСКИД', 'dump'],
    ['СЕДАН-B', null],
    ['УНІВЕРСАЛ', null],
    ['ПР-БОРТОВИЙ', null],
    ['  кабріолет ', 'convertible']
  ])('%s → %s', (body, expected) => {
    expect(resolveBodyCategory(body)).toBe(expected)
  })

  it('returns null for empty input', () => {
    expect(resolveBodyCategory(null)).toBeNull()
    expect(resolveBodyCategory('')).toBeNull()
  })
})
