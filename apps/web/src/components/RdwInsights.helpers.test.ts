import { describe, expect, it } from 'vitest'

import {
  caravanAdvice,
  estimateZeroTo100,
  exciseAge,
  exciseEngine,
  exciseEur,
  hpPerTonne,
  licenceFor,
  loadKg,
  payloadKg,
  powerEquivalents,
  rankSpeed,
  towVerdict,
  tripTime
} from '@/components/RdwInsights.helpers'

describe('performance', () => {
  it('turns power into fun equivalents, never below one', () => {
    expect(powerEquivalents(110)).toEqual({ horses: 10, people: 1100, kettles: 55 })
    expect(powerEquivalents(5).horses).toBe(1)
  })

  it('computes hp per tonne', () => {
    expect(hpPerTonne(100, 1360)).toBe(100)
  })

  it('estimates 0-100 within a second of known cars', () => {
    expect(Math.abs(estimateZeroTo100(90, 1250) - 9.5)).toBeLessThanOrEqual(1)
    expect(Math.abs(estimateZeroTo100(427, 1640) - 2.8)).toBeLessThanOrEqual(1)
  })

  it('ranks a speed between two anchors', () => {
    expect(rankSpeed(180)).toMatchObject({ slower: { key: 'train' }, faster: { key: 'shinkansen' } })
    expect(rankSpeed(30)).toEqual({ slower: null, faster: expect.objectContaining({ key: 'bolt' }) })
    expect(rankSpeed(400).faster).toBeNull()
  })

  it('splits a trip time', () => {
    expect(tripTime(540, 130)).toEqual({ hours: 4, minutes: 9 })
  })
})

describe('mass and towing', () => {
  it('needs both masses for a payload', () => {
    expect(payloadKg(1900, 1300)).toBe(600)
    expect(payloadKg(null, 1300)).toBeNull()
    expect(payloadKg(1200, 1300)).toBeNull()
  })

  it('counts the adults beyond the driver plus luggage', () => {
    expect(loadKg(1, 0)).toBe(0)
    expect(loadKg(4, 40)).toBe(265)
  })

  it('judges a trailer against the unbraked then braked limit', () => {
    expect(towVerdict(500, 600, 1500)).toBe('any')
    expect(towVerdict(1000, 600, 1500)).toBe('braked')
    expect(towVerdict(2000, 600, 1500)).toBe('no')
    expect(towVerdict(500, null, null)).toBe('no')
  })

  it('advises 85 % of the kerb mass', () => {
    expect(caravanAdvice(1400)).toBe(1190)
  })

  it('picks the licence category', () => {
    expect(licenceFor(1900, 750)).toBe('B')
    expect(licenceFor(1600, 1800)).toBe('B')
    expect(licenceFor(2200, 1800)).toBe('BE')
    expect(licenceFor(2200, 3600)).toBe('CE')
    expect(licenceFor(5000, 500)).toBe('C1')
    expect(licenceFor(5000, 2000)).toBe('C1E')
    expect(licenceFor(12000, 500)).toBe('C')
  })
})

describe('import excise', () => {
  it('maps the registry fuel to an excise row', () => {
    expect(exciseEngine(['petrol'])).toBe('petrol')
    expect(exciseEngine(['petrol', 'gas'])).toBe('petrol')
    expect(exciseEngine(['diesel'])).toBe('diesel')
    expect(exciseEngine(['electric', 'petrol'])).toBeNull()
    expect(exciseEngine(['gas'])).toBeNull()
  })

  it('clamps the age to 1..15', () => {
    expect(exciseAge(2026, 2026)).toBe(1)
    expect(exciseAge(2020, 2026)).toBe(6)
    expect(exciseAge(1990, 2026)).toBe(15)
  })

  it('applies base × litres × age with the size thresholds', () => {
    expect(exciseEur('petrol', 2000, 5)).toBe(500)
    expect(exciseEur('diesel', 1600, 3)).toBe(360)
    expect(exciseEur('petrol', 3500, 2)).toBe(700)
    expect(exciseEur('diesel', 4000, 1)).toBe(600)
  })
})
