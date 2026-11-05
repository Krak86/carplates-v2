import { describe, expect, it } from 'vitest'

import { hourLabel, hourShares, hoursFromBuckets, peakHours } from '@/routes/alarms/rhythm-helpers'

describe('hoursFromBuckets', () => {
  it('fills 24 hours, sums duplicates and ignores out-of-range buckets', () => {
    const hours = hoursFromBuckets([
      { bucket: 0, crashes: 5 },
      { bucket: 23, crashes: 2 },
      { bucket: 23, crashes: 1 },
      { bucket: 24, crashes: 99 },
      { bucket: -1, crashes: 99 }
    ])
    expect(hours).toHaveLength(24)
    expect(hours[0]).toBe(5)
    expect(hours[23]).toBe(3)
    expect(hours.reduce((a, b) => a + b, 0)).toBe(8)
  })
})

describe('hourShares', () => {
  it('sums to 1 and is all zeros for an empty day', () => {
    const shares = hourShares([1, 3, 0, 0])
    expect(shares).toEqual([0.25, 0.75, 0, 0])
    expect(hourShares([0, 0])).toEqual([0, 0])
  })
})

describe('peakHours', () => {
  it('returns every tied maximum and nothing for an empty day', () => {
    expect(peakHours([1, 4, 4, 2])).toEqual([1, 2])
    expect(peakHours([0, 0, 0])).toEqual([])
  })
})

describe('hourLabel', () => {
  it('pads to two digits', () => {
    expect(hourLabel(7)).toBe('07')
    expect(hourLabel(23)).toBe('23')
  })
})
