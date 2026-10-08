import { describe, expect, it } from 'vitest'

import {
  approxCount,
  ccToLitres,
  cmToMetres,
  describeRange,
  formatPercent,
  kgToTonnes,
  kwToHp,
  SPEC_ROWS,
  visibleShares
} from '@/components/RdwSpecs.helpers'

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

describe('describeRange options', () => {
  it('snaps to a step and groups digits (prices)', () => {
    expect(describeRange({ min: 12539, median: 30984, max: 153551 }, { step: 100, locale: 'en' })).toEqual({
      main: '31,000',
      spread: '12,500–153,600'
    })
  })

  it('keeps decimals and shows a one-tenth spread (consumption)', () => {
    expect(describeRange({ min: 5.8, median: 5.8, max: 5.9 }, { decimals: 1 })).toEqual({ main: '5.8', spread: null })
    expect(describeRange({ min: 4.6, median: 5.8, max: 7.1 }, { decimals: 1 })).toEqual({
      main: '5.8',
      spread: '4.6–7.1'
    })
  })
})

describe('visibleShares and formatPercent', () => {
  it('drops classes under 2 % and caps the count', () => {
    const items = [
      { key: 'petrol', share: 0.6 },
      { key: 'diesel', share: 0.3 },
      { key: 'hev', share: 0.08 },
      { key: 'phev', share: 0.015 }
    ]
    expect(visibleShares(items, 4).map(i => i.key)).toEqual(['petrol', 'diesel', 'hev'])
    expect(visibleShares(items, 2).map(i => i.key)).toEqual(['petrol', 'diesel'])
    expect(visibleShares(null, 3)).toEqual([])
  })

  it('formats whole percents and "<1%"', () => {
    expect(formatPercent(0.624)).toBe('62%')
    expect(formatPercent(0.003)).toBe('<1%')
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

  it('converts centimetres to metres', () => {
    expect(cmToMetres(428)).toBe('4.28')
    expect(cmToMetres(180)).toBe('1.8')
  })

  it('reads the C2 rows defensively: an answer cached before C2 has none of the new keys', () => {
    const old = { year: 2018, n: 100, powerKw: null, displacementCc: null, massKg: null, co2GKm: null }
    expect(SPEC_ROWS.map(r => r.pick(old))).toEqual(SPEC_ROWS.map(() => null))
  })
})
