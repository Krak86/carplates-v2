import { describe, expect, it } from 'vitest'

import { originBars } from '@/routes/stats/OriginStatsPanel.helpers'

describe('originBars', () => {
  const rows = [
    { country: 'DE', n: 50 },
    { country: 'JP', n: 30 },
    { country: 'CZ', n: 10 },
    { country: '', n: 10 }
  ]

  it('shares are of all cars, unknown kept apart', () => {
    const out = originBars(rows, 100)
    expect(out.bars.map(b => [b.country, b.share])).toEqual([
      ['DE', 0.5],
      ['JP', 0.3],
      ['CZ', 0.1]
    ])
    expect(out.unknown).toBe(10)
    expect(out.other).toBe(0)
    expect(out.maxShare).toBe(0.5)
  })

  it('folds the tail into other', () => {
    const out = originBars(rows, 100, 2)
    expect(out.bars).toHaveLength(2)
    expect(out.other).toBe(10)
  })

  it('handles no rows', () => {
    expect(originBars([], 0)).toEqual({ bars: [], other: 0, unknown: 0, maxShare: 0 })
  })
})
