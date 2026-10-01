import { describe, expect, it } from 'vitest'

import { classifyQuery, denormalizePlate, isVin, normalizePlate, repairOcrPlate, isUaPlate, isLegacyUaPlate } from './plate.js'

describe('normalizePlate', () => {
  it('maps each Latin homoglyph to its Cyrillic twin', () => {
    expect(normalizePlate('ABCEHIKMOPTX')).toBe('АВСЕНІКМОРТХ')
  })

  it('converts a Latin-typed plate to the canonical Cyrillic key', () => {
    expect(normalizePlate('BE7116AA')).toBe('ВЕ7116АА')
    expect(normalizePlate('AA1234BC')).toBe('АА1234ВС')
  })

  it('strips spaces and slashes and uppercases', () => {
    expect(normalizePlate('  be 7116 aa ')).toBe('ВЕ7116АА')
    expect(normalizePlate('be/7116/aa')).toBe('ВЕ7116АА')
  })

  it('leaves an already-Cyrillic plate untouched', () => {
    expect(normalizePlate('ВЕ7116АА')).toBe('ВЕ7116АА')
  })

  it('is idempotent', () => {
    const once = normalizePlate('be 7116 aa')
    expect(normalizePlate(once)).toBe(once)
  })
})

describe('denormalizePlate', () => {
  it('is the inverse for the homoglyph set', () => {
    expect(denormalizePlate('ВЕ7116АА')).toBe('BE7116AA')
    expect(denormalizePlate(normalizePlate('BE7116AA'))).toBe('BE7116AA')
  })
})

describe('isVin', () => {
  it('accepts a 17-char VIN of the ISO 3779 alphabet', () => {
    expect(isVin('3VWD17AJ9GM299880')).toBe(true)
    expect(isVin('KNAD6814BK6246077')).toBe(true)
    expect(isVin(' 3vwd17aj9gm299880 ')).toBe(true)
  })

  it('rejects non-VIN input', () => {
    expect(isVin('ВЕ7116АА')).toBe(false)
    expect(isVin('')).toBe(false)
    expect(isVin('3VWD17AJ9GM29988')).toBe(false) // 16
    expect(isVin('IOQIOQIOQIOQIOQIO')).toBe(false) // 17 but I/O/Q not allowed
  })
})

describe('classifyQuery', () => {
  it('routes 17-char alnum to vin, everything else to plate', () => {
    expect(classifyQuery('3VWD17AJ9GM299880')).toBe('vin')
    expect(classifyQuery('BE7116AA')).toBe('plate')
  })
})

describe('repairOcrPlate', () => {
  it('repairs 1→I only in the outer letter blocks', () => {
    expect(repairOcrPlate('ВН01791С')).toBe('ВН0179IС')
    expect(repairOcrPlate('B13030B1')).toBe('BI3030BI')
  })

  it('is idempotent', () => {
    expect(repairOcrPlate('ВН0179IС')).toBe('ВН0179IС')
  })

  it('leaves a non-8-char read untouched', () => {
    expect(repairOcrPlate('AB123CD')).toBe('AB123CD')
  })

  it('composes with normalizePlate into the canonical key', () => {
    expect(normalizePlate(repairOcrPlate('BH01791C'))).toBe('ВН0179ІС')
  })
})
describe('isUaPlate', () => {
  it('accepts a full standard plate in either script', () => {
    expect(isUaPlate('BE7116AA')).toBe(true)
    expect(isUaPlate('ВЕ 7116 АА')).toBe(true)
  })

  it('accepts the extra Latin letters (electric-car series) and the legacy digit-first shape', () => {
    for (const v of ['BC1554ZA', 'AA2762YA', 'DI0001JA', '50ВТ2782', '11AA1234']) expect(isUaPlate(v)).toBe(true)
  })

  it('rejects partial, foreign and non-plate text', () => {
    for (const v of ['BC15', '2SR4491', 'HOTEL', 'BE7116A', 'B8T81', '']) expect(isUaPlate(v)).toBe(false)
  })
})

describe('repairOcrPlate by slot', () => {
  it('repairs the standard shape, including Z read as 2', () => {
    expect(repairOcrPlate('BC15542A')).toBe('BC1554ZA')
    expect(repairOcrPlate('8E0O44B8')).toBe('BE0044BB')
  })

  it('detects the legacy digit-first shape and repairs its letters', () => {
    expect(repairOcrPlate('50BT2782')).toBe('50BT2782')
    expect(repairOcrPlate('5OBT27B2')).toBe('50BT2782')
    expect(repairOcrPlate('11A12345')).toBe('11AI2345')
  })
})

describe('stacked two-row plates', () => {
  it('accepts 4 letters + 4 digits', () => {
    expect(isUaPlate('KAEO3881')).toBe(true)
    expect(isUaPlate('BIAC5142')).toBe(true)
  })

  it('repairs by slot into that shape', () => {
    expect(repairOcrPlate('KAE03881')).toBe('KAEO3881')
    expect(repairOcrPlate('BIAC5I42')).toBe('BIAC5142')
  })

  it('keeps the common shape on a tie', () => {
    expect(repairOcrPlate('BC15542A')).toBe('BC1554ZA')
  })
})

describe('isLegacyUaPlate', () => {
  it('flags only the digits-first shape', () => {
    expect(isLegacyUaPlate('50ВТ2782')).toBe(true)
    expect(isLegacyUaPlate('BE7116AA')).toBe(false)
  })
})
