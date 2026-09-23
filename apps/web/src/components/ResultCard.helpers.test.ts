import { describe, expect, it } from 'vitest'

import { getFuelIcon, isKnownFuel } from '@/components/ResultCard.helpers'

describe('getFuelIcon', () => {
  it('returns the empty string for a missing fuel', () => {
    expect(getFuelIcon(null)).toBe('')
    expect(getFuelIcon(undefined)).toBe('')
    expect(getFuelIcon('')).toBe('')
  })

  it('maps each base fuel found in the live registry to its icon', () => {
    expect(getFuelIcon('БЕНЗИН')).toBe('⛽')
    expect(getFuelIcon('ДИЗЕЛЬНЕ ПАЛИВО')).toBe('🛢️')
    expect(getFuelIcon('ГАЗ')).toBe('💨')
    expect(getFuelIcon('ЕЛЕКТРО')).toBe('🔋')
    expect(getFuelIcon('ВОДЕНЬ')).toBe('💧')
  })

  it('stacks an icon per fuel for hybrid/combo values found in the live registry', () => {
    expect(getFuelIcon('БЕНЗИН АБО ГАЗ')).toBe('⛽💨')
    expect(getFuelIcon('ЕЛЕКТРО АБО БЕНЗИН')).toBe('🔋⛽')
    expect(getFuelIcon('ЕЛЕКТРО АБО ДИЗЕЛЬНЕ ПАЛИВО')).toBe('🔋🛢️')
    expect(getFuelIcon('БЕНЗИН, ГАЗ АБО ЕЛЕКТРО')).toBe('🔋⛽💨')
    expect(getFuelIcon('ДИЗЕЛЬНЕ ПАЛИВО АБО ГАЗ')).toBe('🛢️💨')
    expect(getFuelIcon('ГАЗ ТА ЕЛЕКТРО')).toBe('🔋💨')
  })

  it('falls back for unknown/absent markers found in the live registry', () => {
    expect(getFuelIcon('НЕ ВИЗНАЧЕНО')).toBe('❓')
    expect(getFuelIcon('ВІДСУТНЄ')).toBe('❓')
    expect(getFuelIcon('.')).toBe('❓')
  })
})

describe('isKnownFuel', () => {
  it('is true for a base fuel or a combo of them', () => {
    expect(isKnownFuel('БЕНЗИН')).toBe(true)
    expect(isKnownFuel('ЕЛЕКТРО АБО ДИЗЕЛЬНЕ ПАЛИВО')).toBe(true)
  })

  it('is false for null, blank, and the unknown/absent/garbage markers', () => {
    expect(isKnownFuel(null)).toBe(false)
    expect(isKnownFuel(undefined)).toBe(false)
    expect(isKnownFuel('')).toBe(false)
    expect(isKnownFuel('NULL')).toBe(false)
    expect(isKnownFuel('НЕ ВИЗНАЧЕНО')).toBe(false)
    expect(isKnownFuel('ВІДСУТНЄ')).toBe(false)
    expect(isKnownFuel('.')).toBe(false)
  })
})
