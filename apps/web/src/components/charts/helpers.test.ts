import { describe, expect, it } from 'vitest'

import { niceMax, showsLabel } from './helpers'

describe('niceMax', () => {
  it('rounds the axis up', () => {
    expect(niceMax(0)).toBe(1)
    expect(niceMax(204573)).toBe(250000)
    expect(niceMax(100000)).toBe(100000)
  })
})

describe('showsLabel', () => {
  it('counts from the newest column by default of the trend chart', () => {
    const shown = Array.from({ length: 12 }, (_, i) => showsLabel(i, 12, 3, 'end'))
    expect(shown.flatMap((s, i) => (s ? [i] : []))).toEqual([2, 5, 8, 11])
  })

  it('counts from the first column', () => {
    const shown = Array.from({ length: 24 }, (_, i) => showsLabel(i, 24, 3, 'start'))
    expect(shown.flatMap((s, i) => (s ? [i] : []))).toEqual([0, 3, 6, 9, 12, 15, 18, 21])
  })
})
