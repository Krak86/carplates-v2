import type { StatsByDimensionRow } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import { ageSummary, colorShares, fuelShares } from '@/routes/read/fleet/helpers'

const row = (value: string | null, n: number): StatsByDimensionRow => ({
  value,
  totalRows: n,
  distinctPlates: n,
  distinctVins: n
})

describe('colorShares', () => {
  it('merges spellings of one colour, drops unknown ones and sorts biggest first', () => {
    const shares = colorShares([
      row('СІРИЙ', 5),
      row('ЖОВТОГАРЯЧИЙ', 1),
      row('ПОМАРАНЧЕВИЙ (ОРАНЖЕВИЙ)', 2),
      row('БІЛИЙ', 4),
      row('???', 9),
      row(null, 9)
    ])
    expect(shares).toEqual([
      { key: 'gray', n: 5 },
      { key: 'white', n: 4 },
      { key: 'orange', n: 3 }
    ])
  })
})

describe('fuelShares', () => {
  it('groups by the set of base fuels and skips unknown markers', () => {
    const shares = fuelShares([row('БЕНЗИН', 6), row('БЕНЗИН, ГАЗ', 3), row('БЕНЗИН ТА ГАЗ', 1), row('ВІДСУТНЄ', 50)])
    expect(shares.map(s => [s.key.join('+'), s.n])).toEqual([
      ['petrol', 6],
      ['petrol+gas', 4]
    ])
  })
})

describe('ageSummary', () => {
  it('finds the median year and the recent share', () => {
    const summary = ageSummary(
      [row('2026', 10), row('2010', 60), row('2024', 20), row(null, 99), row('2000', 10)],
      2026
    )
    expect(summary.years.map(y => y.key)).toEqual([2000, 2010, 2024, 2026])
    expect(summary.total).toBe(100)
    expect(summary.medianYear).toBe(2010)
    expect(summary.recentPercent).toBe(30)
  })

  it('copes with no data', () => {
    expect(ageSummary([], 2026)).toMatchObject({ total: 0, medianYear: null, recentPercent: 0 })
  })
})
