import { describe, expect, it } from 'vitest'

import { gsr2Baseline, gsr2Stages, gsr2Status } from '@/components/vin/gsr2'

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

  it('lists only the first-stage systems for 2022-2023', () => {
    expect(gsr2Baseline(2023).map(s => s.key)).toEqual(['aeb', 'elks', 'isa', 'ddaw'])
    expect(gsr2Baseline(2023).every(s => s.status === 'newTypes')).toBe(true)
  })

  it('adds ADDW and pedestrian AEB (new types only) in 2025', () => {
    const items = gsr2Baseline(2025)
    expect(items.map(s => s.key)).toEqual(['aeb', 'elks', 'isa', 'ddaw', 'addw', 'aebpc'])
    expect(items.filter(s => s.status === 'all')).toHaveLength(4)
    expect(items.filter(s => s.status === 'newTypes').map(s => s.key)).toEqual(['addw', 'aebpc'])
  })

  it('makes the second stage depend on the month in 2026 and mandatory from 2027', () => {
    expect(gsr2Baseline(2026).find(s => s.key === 'addw')?.status).toBe('transition')
    expect(gsr2Baseline(2027).find(s => s.key === 'aebpc')?.status).toBe('all')
  })
})

describe('gsr2Stages', () => {
  it('splits the items by rule dates', () => {
    expect(gsr2Stages(gsr2Baseline(2023))).toHaveLength(1)
    expect(gsr2Stages(gsr2Baseline(2025)).map(g => g.length)).toEqual([4, 2])
  })
})
