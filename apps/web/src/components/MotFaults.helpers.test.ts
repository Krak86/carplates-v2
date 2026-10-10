import { describe, it, expect } from 'vitest'

import {
  bandLabel,
  bandOfKm,
  motCarTab,
  parseMotCarTab,
  endsOf,
  formatShare,
  formatTests,
  groupKey,
  niceMax,
  peakOf,
  trendOf,
  yearsLabel
} from './MotFaults.helpers'

const EDGES = [0, 25_000, 50_000, 100_000]

describe('bandLabel', () => {
  it('writes thousand-km ranges and an open last band', () => {
    expect(bandLabel(EDGES, 0)).toBe('0–25')
    expect(bandLabel(EDGES, 1)).toBe('25–50')
    expect(bandLabel(EDGES, 3)).toBe('100+')
  })
})

describe('formatShare / formatTests', () => {
  it('uses one decimal under 10 % and none above', () => {
    expect(formatShare(0.0234)).toBe('2.3 %')
    expect(formatShare(0.234)).toBe('23 %')
    expect(formatShare(0.0997)).toBe('10 %')
    expect(formatShare(null)).toBe('–')
  })

  it('groups thousands', () => {
    expect(formatTests(1234567)).toBe('1 234 567')
    expect(formatTests(950)).toBe('950')
  })
})

describe('series helpers', () => {
  it('rounds the axis up to a clean top', () => {
    expect(niceMax(0.03)).toBe(0.05)
    expect(niceMax(0.23)).toBe(0.25)
    expect(niceMax(0.9)).toBe(1)
  })

  it('finds the peak and the ends, skipping missing bands', () => {
    expect(peakOf([null, 0.1, 0.3, 0.2])).toEqual({ band: 2, value: 0.3 })
    expect(peakOf([null, null])).toBeNull()
    expect(endsOf([null, 0.1, 0.3, null])).toEqual({ first: 1, last: 2 })
    expect(endsOf([0.1, null])).toBeNull()
  })

  it('calls a small change flat', () => {
    expect(trendOf([0.1, 0.2, 0.4])).toBe('rising')
    expect(trendOf([0.4, 0.3, 0.1])).toBe('falling')
    expect(trendOf([0.2, 0.22, 0.21])).toBe('flat')
    expect(trendOf([null, null])).toBe('flat')
  })
})

describe('labels', () => {
  it('maps known groups and falls back to other', () => {
    expect(groupKey('brakes')).toBe('mot.group.brakes')
    expect(groupKey('something-new')).toBe('mot.group.other')
  })

  it('collapses a one-year range', () => {
    expect(yearsLabel(2014, 2014)).toBe('2014')
    expect(yearsLabel(2012, 2016)).toBe('2012–2016')
  })
})

describe('my-car share tab', () => {
  const edges = [0, 25_000, 50_000, 75_000]

  it('finds the band of an odometer value', () => {
    expect(bandOfKm(edges, 0)).toBe(0)
    expect(bandOfKm(edges, 49_999)).toBe(1)
    expect(bandOfKm(edges, 500_000)).toBe(3)
  })

  it('round-trips an odometer value or a band', () => {
    expect(parseMotCarTab(motCarTab({ km: 60_000, band: 2 }), 4, edges)).toEqual({ km: 60_000, band: 2 })
    expect(parseMotCarTab(motCarTab({ km: null, band: 1 }), 4, edges)).toEqual({ km: null, band: 1 })
  })

  it('ignores a hand-edited tab', () => {
    expect(parseMotCarTab('b9', 4, edges)).toBeNull()
    expect(parseMotCarTab('km', 4, edges)).toBeNull()
    expect(parseMotCarTab(null, 4, edges)).toBeNull()
  })
})
