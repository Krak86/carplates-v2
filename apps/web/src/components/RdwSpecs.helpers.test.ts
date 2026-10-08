import { describe, expect, it } from 'vitest'

import { approxCount, ccToLitres, describeRange, kgToTonnes, kwToHp } from '@/components/RdwSpecs.helpers'

describe('describeRange', () => {
  it('shows the median and the spread when they differ', () => {
    expect(describeRange({ min: 66, median: 85, max: 110 })).toEqual({ main: '85', spread: '66–110' })
  })

  it('drops a negligible spread', () => {
    expect(describeRange({ min: 1498, median: 1498, max: 1499 })).toEqual({ main: '1498', spread: null })
  })

  it('rounds fractional figures', () => {
    expect(describeRange({ min: 1289.5, median: 1290.4, max: 1291 }).main).toBe('1290')
  })
})

describe('kwToHp', () => {
  it('converts to metric horsepower', () => {
    expect(kwToHp(85)).toBe(116)
    expect(kwToHp(100)).toBe(136)
  })
})

describe('unit conversions', () => {
  it('shows litres with one decimal', () => {
    expect(ccToLitres(1798)).toBe('1.8')
    expect(ccToLitres(999)).toBe('1.0')
  })

  it('shows tonnes with up to two decimals, no trailing zeros', () => {
    expect(kgToTonnes(1240)).toBe('1.24')
    expect(kgToTonnes(1800)).toBe('1.8')
    expect(kgToTonnes(169)).toBe('0.17')
    expect(kgToTonnes(3000)).toBe('3')
  })
})

describe('approxCount', () => {
  it('keeps small counts exact', () => {
    expect(approxCount(3, 'en')).toBe('3')
    expect(approxCount(9, 'en')).toBe('9')
  })

  it('rounds to two significant digits with a tilde', () => {
    expect(approxCount(10, 'en')).toBe('~10')
    expect(approxCount(47, 'en')).toBe('~47')
    expect(approxCount(516, 'en')).toBe('~520')
    expect(approxCount(4738, 'en')).toBe('~4,700')
    expect(approxCount(26612, 'en')).toBe('~27,000')
  })
})
