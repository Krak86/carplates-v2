import { describe, expect, it } from 'vitest'

import { countOwners } from './owners.js'

const a = (operCode: number | null, operName: string | null) => ({ operCode, operName })

describe('countOwners', () => {
  it('is 0 for an empty history', () => {
    expect(countOwners([])).toBe(0)
  })

  it('counts the first registration plus each change of owner', () => {
    expect(
      countOwners([
        a(300, 'ПЕРЕРЕЄСТРАЦIЯ У ЗВ`ЯЗКУ ЗІ ЗМІНОЮ ВЛАСНИКА'),
        a(390, 'ПЕРЕРЕЄСТРАЦIЯ У ЗВ`ЯЗКУ ЗI ЗМIНОЮ КОЛЬОРУ ТЗ'),
        a(300, 'ПЕРЕРЕЄСТРАЦIЯ У ЗВ`ЯЗКУ ЗІ ЗМІНОЮ ВЛАСНИКА'),
        a(100, 'ПЕРВИННА РЕЄСТРАЦIЯ')
      ])
    ).toBe(3)
  })

  it('ignores a change of the owner’s name or address', () => {
    expect(
      countOwners([a(310, 'ПЕРЕРЕЄСТРАЦІЯ У ЗВ`ЯЗКУ ЗІ ЗМІНОЮ ПРІЗВИЩА ВЛАСНИКА'), a(100, 'ПЕРВИННА РЕЄСТРАЦIЯ')])
    ).toBe(1)
  })

  it('counts sale-contract re-registrations, not "proper user" registrations (ВС6743РН)', () => {
    expect(
      countOwners([
        a(1, 'ПЕРЕРЕЄСТРАЦІЯ ТЗ ІЗ УКЛАДАННЯМ ДОГОВОРУ КУПІВЛІ-ПРОДАЖУ ЧЕРЕЗ ЕЛЕКТРОННІ СЕРВІСИ ТА ЗОВНІШНІ РЕСУРСИ'),
        a(2, 'НАЛЕЖНИЙ КОРИСТУВАЧ. РЕЄСТРАЦІЯ'),
        a(2, 'НАЛЕЖНИЙ КОРИСТУВАЧ. РЕЄСТРАЦІЯ'),
        a(3, 'ПЕРЕРЕЄСТРАЦІЯ ТЗ НА НОВ. ВЛАСН. ПО ДОГОВОРУ УКЛАДЕНОМУ В ТСЦ')
      ])
    ).toBe(2)
  })

  it('counts a registration of an imported vehicle as the first owner (DІ7635ІА)', () => {
    expect(
      countOwners([
        a(1, 'ПЕРЕРЕЄСТРАЦІЯ ТЗ ІЗ УКЛАДАННЯМ ДОГОВОРУ КУПІВЛІ-ПРОДАЖУ ЧЕРЕЗ ЕЛЕКТРОННІ СЕРВІСИ ТА ЗОВНІШНІ РЕСУРСИ'),
        a(2, 'РЕЄСТРАЦІЯ ТЗ ПРИВЕЗЕНОГО З-ЗА КОРДОНУ ПО ПОСВІДЧЕННЮ МИТНИЦІ')
      ])
    ).toBe(2)
  })

  it('does not count a plain re-registration (replaced plates, colour) as an owner', () => {
    expect(
      countOwners([a(1, 'ПЕРЕРЕЄСТРАЦІЯ ТЗ У ЗВ`ЯЗКУ ЗІ ЗАМІНОЮ НОМЕРНОГО ЗНАКА'), a(2, 'ПЕРВИННА РЕЄСТРАЦIЯ')])
    ).toBe(1)
  })

  it('is at least 1 when the history starts after the first registration', () => {
    expect(countOwners([a(390, 'ПЕРЕРЕЄСТРАЦIЯ У ЗВ`ЯЗКУ ЗI ЗМIНОЮ КОЛЬОРУ ТЗ')])).toBe(1)
  })

  it('falls back to the code when the name is missing', () => {
    expect(countOwners([a(300, null), a(100, null)])).toBe(2)
  })
})
