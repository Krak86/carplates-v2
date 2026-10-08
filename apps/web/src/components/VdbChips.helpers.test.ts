import { describe, expect, it } from 'vitest'

import { decileBand, formatShare, isRareElsewhere } from '@/components/VdbChips.helpers'

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

describe('formatShare', () => {
  it('rounds to whole percents from 1% up and shows one decimal below', () => {
    expect(formatShare(13, 100, 'en-US')).toBe('13%')
    expect(formatShare(1, 100, 'en-US')).toBe('1%')
    expect(formatShare(130_000, 24_700_000, 'en-US')).toBe('0.5%')
    expect(formatShare(40, 10_000, 'en-US')).toBe('0.4%')
  })

  it('handles empty and tiny shares', () => {
    expect(formatShare(0, 100, 'en-US')).toBe('0%')
    expect(formatShare(5, 0, 'en-US')).toBe('0%')
    expect(formatShare(1, 100_000, 'en-US')).toBe('<0.1%')
  })
})
