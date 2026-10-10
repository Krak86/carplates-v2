import { describe, expect, it } from 'vitest'

import {
  bandForCo2,
  barPercent,
  coveragePercent,
  formatPercent,
  parseFuelClass,
  parsePowertrainView,
  plausibleYear,
  searchFuelFor
} from '@/routes/fuel/helpers'

describe('barPercent', () => {
  it('scales linearly against the score cap and clamps', () => {
    expect(barPercent(0)).toBe(0)
    expect(barPercent(150)).toBe(50)
    expect(barPercent(900)).toBe(100)
    expect(barPercent(null)).toBe(0)
  })
})

describe('bandForCo2', () => {
  it('uses the shared score bands', () => {
    expect(bandForCo2(0)).toBe('green')
    expect(bandForCo2(120)).toBe('yellow')
    expect(bandForCo2(240)).toBe('red')
  })
})

describe('coveragePercent', () => {
  it('is matched over total, 0 for an empty row', () => {
    expect(coveragePercent({ n: 200, matched: 50 })).toBe(25)
    expect(coveragePercent({ n: 0, matched: 0 })).toBe(0)
  })
})

describe('plausibleYear', () => {
  it('drops junk registry years', () => {
    expect(plausibleYear('2015', 2026)).toBe(true)
    expect(plausibleYear('0', 2026)).toBe(false)
    expect(plausibleYear('2099', 2026)).toBe(false)
  })
})

describe('formatPercent', () => {
  it('keeps a decimal below 10 %, rounds above, and flags tiny shares', () => {
    expect(formatPercent(0)).toBe('0.0%')
    expect(formatPercent(0.04)).toBe('<0.1%')
    expect(formatPercent(3.456)).toBe('3.5%')
    expect(formatPercent(42.4)).toBe('42%')
  })
})

describe('searchFuelFor', () => {
  it('maps classes the search filter knows and skips the rest', () => {
    expect(searchFuelFor('electric')).toBe('electric')
    expect(searchFuelFor('diesel')).toBe('diesel')
    expect(searchFuelFor('hybrid')).toBeNull()
    expect(searchFuelFor('unknown')).toBeNull()
  })
})

describe('powertrain URL params', () => {
  it('parses known values and falls back otherwise', () => {
    expect(parsePowertrainView('rare')).toBe('rare')
    expect(parsePowertrainView('nope')).toBe('models')
    expect(parsePowertrainView(null)).toBe('models')
    expect(parseFuelClass('gas')).toBe('gas')
    expect(parseFuelClass('nope')).toBeNull()
  })
})
