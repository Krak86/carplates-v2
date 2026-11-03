import { describe, expect, it } from 'vitest'

import { foldMonthlyStats } from './stats-monthly.js'

describe('foldMonthlyStats', () => {
  it('pivots groups per month, ascending, ignoring unknown groups', () => {
    const out = foldMonthlyStats([
      { month: '2026-02', opGroup: 'resale', isCar: true, n: 5 },
      { month: '2026-01', opGroup: 'new', isCar: true, n: 2 },
      { month: '2026-01', opGroup: 'import', isCar: true, n: 3 },
      { month: '2026-01', opGroup: 'weird', isCar: true, n: 99 },
      { month: '2026-01', opGroup: null, isCar: true, n: 99 }
    ])
    expect(out.months).toEqual([
      {
        month: '2026-01',
        new: 2,
        import: 3,
        resale: 0,
        cars: { new: 2, import: 3, resale: 0 }
      },
      {
        month: '2026-02',
        new: 0,
        import: 0,
        resale: 5,
        cars: { new: 0, import: 0, resale: 5 }
      }
    ])
  })

  it('sums every kind into the totals and only passenger cars into `cars`', () => {
    const out = foldMonthlyStats([
      { month: '2026-01', opGroup: 'new', isCar: true, n: 7 },
      { month: '2026-01', opGroup: 'new', isCar: false, n: 3 },
      { month: '2026-01', opGroup: 'resale', isCar: false, n: 4 }
    ])
    expect(out.months).toEqual([
      { month: '2026-01', new: 10, import: 0, resale: 4, cars: { new: 7, import: 0, resale: 0 } }
    ])
  })

  it('keeps only the latest 24 months', () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      month: `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
      opGroup: 'new',
      isCar: true,
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
