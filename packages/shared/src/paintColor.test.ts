import { describe, expect, it } from 'vitest'

import {
  PAINT_HEX,
  hexToRgb,
  isClosePaint,
  labOf,
  linearToSrgb,
  luminanceOf,
  paintBucketOf,
  srgbToLinear
} from './paintColor.js'
import { VEHICLE_COLORS } from './vehicleColor.js'

describe('PAINT_HEX', () => {
  it('has a valid hex for every registry colour', () => {
    for (const color of VEHICLE_COLORS) expect(PAINT_HEX[color]).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('labOf', () => {
  it('maps white and black to the lightness extremes', () => {
    expect(labOf('#ffffff')[0]).toBeCloseTo(100, 0)
    expect(labOf([0, 0, 0])[0]).toBeCloseTo(0, 0)
  })
  it('accepts hex and rgb alike', () => {
    expect(labOf('#c4161c')).toEqual(labOf(hexToRgb('#c4161c')))
  })
  it('rejects a malformed hex', () => {
    expect(() => labOf('red')).toThrow()
  })
})

describe('srgb transfer', () => {
  it('round-trips', () => {
    for (const c of [0, 10, 128, 255]) expect(linearToSrgb(srgbToLinear(c))).toBeCloseTo(c, 5)
  })
  it('luminance of white is 1', () => {
    expect(luminanceOf(255, 255, 255)).toBeCloseTo(1, 5)
  })
})

describe('paintBucketOf', () => {
  it('maps every paint tone to its own bucket', () => {
    for (const color of VEHICLE_COLORS) expect(paintBucketOf(labOf(PAINT_HEX[color]))).toBe(color)
  })
  it('a mid grey is gray, not white', () => {
    expect(paintBucketOf(labOf([150, 150, 150]))).toBe('gray')
    expect(isClosePaint(labOf([150, 150, 150]), 'white')).toBe(false)
  })
  it('a mid silver is not white', () => {
    expect(isClosePaint(labOf([170, 170, 172]), 'white')).toBe(false)
  })
})

describe('isClosePaint', () => {
  it('is true for the same bucket and near shades', () => {
    expect(isClosePaint(labOf(PAINT_HEX.red), 'red')).toBe(true)
    expect(isClosePaint(labOf([200, 30, 35]), 'red')).toBe(true)
  })
  it('is false for different hues', () => {
    expect(isClosePaint(labOf(PAINT_HEX.red), 'blue')).toBe(false)
    expect(isClosePaint(labOf(PAINT_HEX.yellow), 'black')).toBe(false)
  })
})
