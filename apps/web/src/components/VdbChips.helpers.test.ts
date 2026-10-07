import { describe, expect, it } from 'vitest'

import { decileBand, isRareElsewhere } from '@/components/VdbChips.helpers'

describe('decileBand', () => {
  it('labels decile 1 as the top 10% and later deciles as a percentile band', () => {
    expect(decileBand(1)).toBe('10')
    expect(decileBand(2)).toBe('10–20')
    expect(decileBand(10)).toBe('90–100')
  })
})

describe('isRareElsewhere', () => {
  it('flags unpopular models, but not UA-only ones or unranked ones', () => {
    expect(isRareElsewhere(8, false)).toBe(true)
    expect(isRareElsewhere(7, false)).toBe(false)
    expect(isRareElsewhere(9, true)).toBe(false)
    expect(isRareElsewhere(null, false)).toBe(false)
  })
})
