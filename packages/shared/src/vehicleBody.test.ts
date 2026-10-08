import { describe, expect, it } from 'vitest'

import { resolveBodyCategory } from './vehicleBody.js'

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
