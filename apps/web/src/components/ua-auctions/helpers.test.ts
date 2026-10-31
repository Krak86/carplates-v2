import { describe, expect, it } from 'vitest'

import { LOT_STATUS_KEYS, OPEN_STATUS, formatUah, priceDeltaPercent } from './helpers'

describe('priceDeltaPercent', () => {
  it('is relative to the start price and rounded', () => {
    expect(priceDeltaPercent(100000, 125000)).toBe(25)
    expect(priceDeltaPercent(10084.2, 20067.36)).toBe(99)
    expect(priceDeltaPercent(100, 70)).toBe(-30)
  })

  it('is null without both prices or a positive start', () => {
    expect(priceDeltaPercent(null, 5)).toBeNull()
    expect(priceDeltaPercent(5, null)).toBeNull()
    expect(priceDeltaPercent(0, 5)).toBeNull()
  })
})

describe('lot statuses', () => {
  it('maps every feed status and treats registration as the open one', () => {
    expect(Object.keys(LOT_STATUS_KEYS)).toHaveLength(7)
    expect(LOT_STATUS_KEYS[OPEN_STATUS]).toBe('registration')
  })

  it('formats hryvnias and keeps null', () => {
    expect(formatUah(null, 'en')).toBeNull()
    expect(formatUah(103010, 'en')).toContain('103')
  })
})
