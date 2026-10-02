import { describe, expect, it } from 'vitest'

import { CO2_SCORE_MAX_G_KM, co2Band, co2Score, gramsPerMileToGramsPerKm } from './co2Score.js'

describe('co2Score', () => {
  it('maps 0 g/km (EV tailpipe) to 0', () => {
    expect(co2Score(0)).toBe(0)
  })

  it('is linear up to the saturation point', () => {
    expect(co2Score(CO2_SCORE_MAX_G_KM / 2)).toBe(50)
    expect(co2Score(120)).toBe(40)
  })

  it('clamps at 100', () => {
    expect(co2Score(CO2_SCORE_MAX_G_KM)).toBe(100)
    expect(co2Score(900)).toBe(100)
  })

  it('returns null for missing or invalid input', () => {
    expect(co2Score(null)).toBeNull()
    expect(co2Score(undefined)).toBeNull()
    expect(co2Score(-1)).toBeNull()
    expect(co2Score(Number.NaN)).toBeNull()
  })
})

describe('co2Band', () => {
  it('buckets scores into green/yellow/orange/red', () => {
    expect(co2Band(0)).toBe('green')
    expect(co2Band(24)).toBe('green')
    expect(co2Band(25)).toBe('yellow')
    expect(co2Band(50)).toBe('orange')
    expect(co2Band(75)).toBe('red')
    expect(co2Band(100)).toBe('red')
  })
})

describe('gramsPerMileToGramsPerKm', () => {
  it('converts EPA g/mi to g/km', () => {
    expect(gramsPerMileToGramsPerKm(402.336)).toBeCloseTo(250, 1)
  })
})
