import { describe, it, expect } from 'vitest'

import { convertEur, fxResponseSchema } from './fx.js'

const FX = { eurUah: 50, usdUah: 40 }

describe('convertEur', () => {
  it('converts through hryvnias', () => {
    expect(convertEur(100, 'EUR', FX)).toBe(100)
    expect(convertEur(100, 'UAH', FX)).toBe(5000)
    expect(convertEur(100, 'USD', FX)).toBe(125)
  })
})

describe('fxResponseSchema', () => {
  it('rejects a non-positive rate', () => {
    expect(fxResponseSchema.safeParse({ date: '2026-10-09', eurUah: 0, usdUah: 41 }).success).toBe(false)
    expect(fxResponseSchema.safeParse({ date: '2026-10-09', eurUah: 50, usdUah: 41 }).success).toBe(true)
  })
})
