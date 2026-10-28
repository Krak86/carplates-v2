import { describe, expect, it } from 'vitest'

import { gsr2Baseline, gsr2Status } from '@/components/vin/gsr2'

const RULE = { typesFrom: '2022-07-06', allFrom: '2024-07-07' }

describe('gsr2Status', () => {
  it('has no requirement before the regulation', () => {
    expect(gsr2Status(2015, RULE)).toBe('none')
    expect(gsr2Status(2021, RULE)).toBe('none')
  })

  it('needs it for new types from July 2022 (2022 and 2023)', () => {
    expect(gsr2Status(2022, RULE)).toBe('newTypes')
    expect(gsr2Status(2023, RULE)).toBe('newTypes')
  })

  it('depends on the month in 2024', () => {
    expect(gsr2Status(2024, RULE)).toBe('transition')
  })

  it('needs it for every new car from 2025', () => {
    expect(gsr2Status(2025, RULE)).toBe('all')
    expect(gsr2Status(2026, RULE)).toBe('all')
  })
})

describe('gsr2Baseline', () => {
  it('is empty for an unknown or pre-regulation year', () => {
    expect(gsr2Baseline(null)).toEqual([])
    expect(gsr2Baseline(2019)).toEqual([])
  })

  it('lists the four systems with one status', () => {
    expect(gsr2Baseline(2025).map(s => s.key)).toEqual(['aeb', 'elks', 'isa', 'ddaw'])
    expect(gsr2Baseline(2025).every(s => s.status === 'all')).toBe(true)
  })
})
