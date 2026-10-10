import { describe, it, expect } from 'vitest'

import { barPath, gapPath, slotOf } from './MotChart.helpers'

describe('slotOf', () => {
  it('splits the plot into equal slots', () => {
    expect(slotOf(1, 4, 10, 90)).toEqual({ x: 30, width: 20, center: 40 })
  })
})

describe('gapPath', () => {
  it('lifts the pen at missing values', () => {
    const d = gapPath([
      { x: 0, y: 5 },
      { x: 10, y: 6 },
      { x: 20, y: null },
      { x: 30, y: 7 }
    ])
    expect(d).toBe('M0.0 5.0L10.0 6.0M30.0 7.0')
  })

  it('is empty without values', () => {
    expect(gapPath([{ x: 0, y: null }])).toBe('')
  })
})

describe('barPath', () => {
  it('is empty for a zero-height bar', () => {
    expect(barPath(0, 10, 50, 50)).toBe('')
  })

  it('rounds the data end only', () => {
    expect(barPath(0, 20, 10, 50)).toContain('Q0 10 4 10')
    expect(barPath(0, 20, 10, 50).startsWith('M0 50V14')).toBe(true)
  })
})
