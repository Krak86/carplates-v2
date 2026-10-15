import { describe, expect, it } from 'vitest'

import { percentileOf } from './distribution.js'

const histogram = {
  width: 10,
  buckets: [
    [0, 50],
    [10, 30],
    [20, 20]
  ] as [number, number][]
}

describe('percentileOf', () => {
  it('counts whole buckets below and interpolates inside the own one', () => {
    expect(percentileOf(histogram, 10)).toBeCloseTo(0.5)
    expect(percentileOf(histogram, 15)).toBeCloseTo(0.65)
    expect(percentileOf(histogram, 30)).toBe(1)
  })

  it('is 0 below the fleet and null for an empty histogram', () => {
    expect(percentileOf(histogram, -5)).toBe(0)
    expect(percentileOf({ width: 10, buckets: [] }, 5)).toBeNull()
  })
})
