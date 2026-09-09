import { describe, expect, it } from 'vitest'

import { classifyQuery, denormalizePlate, isVin, normalizePlate } from './plate.js'

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
