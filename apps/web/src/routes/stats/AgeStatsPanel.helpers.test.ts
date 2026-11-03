import { describe, expect, it } from 'vitest'

import { ageBars } from './AgeStatsPanel.helpers'

describe('ageBars', () => {
  it('buckets by age at the given year and computes shares of known-year cars', () => {
    const out = ageBars(
      [
        { year: 0, n: 50 },
        { year: 1990, n: 10 },
        { year: 2012, n: 30 },
        { year: 2018, n: 20 },
        { year: 2024, n: 20 },
        { year: 2026, n: 5 },
        { year: 2027, n: 15 }
      ],
      2026
    )
    expect(out.unknown).toBe(50)
    expect(out.total).toBe(100)
    expect(out.bars.map(b => [b.key, b.n])).toEqual([
      ['new', 20],
      ['y1to5', 20],
      ['y6to10', 20],
      ['y11to20', 30],
      ['y21plus', 10]
    ])
    expect(out.bars[0]?.share).toBeCloseTo(0.2)
  })

  it('has zero shares without rows', () => {
    const out = ageBars([], 2026)
    expect(out.total).toBe(0)
    expect(out.bars.every(b => b.share === 0)).toBe(true)
  })
})
