import { describe, expect, it } from 'vitest'

import { foldMonthlyStats } from './stats-monthly.js'

describe('foldMonthlyStats', () => {
  it('pivots groups per month, ascending, ignoring unknown groups', () => {
    const out = foldMonthlyStats([
      { month: '2026-02', opGroup: 'resale', n: 5 },
      { month: '2026-01', opGroup: 'new', n: 2 },
      { month: '2026-01', opGroup: 'import', n: 3 },
      { month: '2026-01', opGroup: 'weird', n: 99 },
      { month: '2026-01', opGroup: null, n: 99 }
    ])
    expect(out.months).toEqual([
      { month: '2026-01', new: 2, import: 3, resale: 0 },
      { month: '2026-02', new: 0, import: 0, resale: 5 }
    ])
  })

  it('keeps only the latest 24 months', () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      month: `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
      opGroup: 'new',
      n: 1
    }))
    const out = foldMonthlyStats(rows)
    expect(out.months).toHaveLength(24)
    expect(out.months[0]?.month).toBe('2024-07')
  })

  it('is empty without rows', () => {
    expect(foldMonthlyStats([])).toEqual({ months: [] })
  })
})
