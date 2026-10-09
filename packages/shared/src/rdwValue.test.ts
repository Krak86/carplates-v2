import { describe, it, expect } from 'vitest'

import { estimateValue, OLD_CAR_FLOOR_SHARE, retainedShare, valueCurve } from './rdwValue.js'

describe('retainedShare', () => {
  it('follows the BPM table at whole years', () => {
    expect(retainedShare(0)).toBe(1)
    expect(retainedShare(1)).toBeCloseTo(0.64)
    expect(retainedShare(2)).toBeCloseTo(0.535)
    expect(retainedShare(3)).toBeCloseTo(0.46)
    expect(retainedShare(5)).toBeCloseTo(0.3548)
    expect(retainedShare(10)).toBeCloseTo(0.1786, 3)
  })

  it('falls with age', () => {
    for (let age = 1; age < 16; age++) expect(retainedShare(age)!).toBeLessThan(retainedShare(age - 1)!)
  })

  it('is null once the table has depreciated the car fully, or for a bad age', () => {
    expect(retainedShare(15)).not.toBeNull()
    expect(retainedShare(18)).toBeNull()
    expect(retainedShare(40)).toBeNull()
    expect(retainedShare(-1)).toBeNull()
    expect(retainedShare(NaN)).toBeNull()
  })
})

describe('estimateValue', () => {
  it('gives a rounded range around new price x curve', () => {
    expect(estimateValue(30000, 3)).toEqual({
      ageYears: 3,
      retained: 0.46,
      extrapolated: false,
      midEur: 13800,
      lowEur: 11700,
      highEur: 15900
    })
  })

  it('is null without a price, for a bad age, or when negligible', () => {
    expect(estimateValue(null, 3)).toBeNull()
    expect(estimateValue(undefined, 3)).toBeNull()
    expect(estimateValue(0, 3)).toBeNull()
    expect(estimateValue(30000, -1)).toBeNull()
    expect(estimateValue(1000, 15)).toBeNull()
  })

  it('holds at the old-car floor past the table and says so', () => {
    const e = estimateValue(20000, 25)!
    expect(e.extrapolated).toBe(true)
    expect(e.retained).toBe(OLD_CAR_FLOOR_SHARE)
    expect(e.midEur).toBe(1000)
    expect(estimateValue(30000, 3)!.extrapolated).toBe(false)
  })
})

describe('valueCurve', () => {
  it('starts at the new price and continues at the floor past the table', () => {
    const curve = valueCurve(20000, 30)
    expect(curve[0]).toEqual({ ageYears: 0, valueEur: 20000 })
    expect(curve).toHaveLength(31)
    expect(curve.at(-1)).toEqual({ ageYears: 30, valueEur: 1000 })
    expect(valueCurve(20000, 2)).toHaveLength(3)
  })
})
