import { describe, expect, it } from 'vitest'

import { CHART_HEIGHT, CHART_WIDTH, lossRows, signed, totalsPath, warDuration } from '@/routes/alarms/losses-helpers'

describe('losses helpers', () => {
  it('keeps a missing counter null, not 0', () => {
    const rows = lossRows({ tanks: 5 }, {})
    expect(rows).toHaveLength(15)
    expect(rows.find(r => r.category === 'tanks')).toEqual({ category: 'tanks', total: 5, increase: null })
    expect(rows.find(r => r.category === 'mlrs')?.total).toBeNull()
  })

  it('signs the daily change', () => {
    expect(signed(12)).toBe('+12')
    expect(signed(-3)).toBe('-3')
    expect(signed(0)).toBe('0')
    expect(signed(null)).toBeNull()
  })

  it('builds no path for fewer than two points', () => {
    expect(totalsPath([{ date: '2022-02-25', total: 1, increase: null }])).toBe('')
  })

  it('spans the chart from the first to the last date, ending at the top for the maximum', () => {
    const path = totalsPath([
      { date: '2022-01-01', total: 0, increase: null },
      { date: '2022-01-03', total: 10, increase: 10 },
      { date: '2022-01-05', total: 20, increase: 10 }
    ])
    expect(path).toBe(`M0.0 ${CHART_HEIGHT.toFixed(1)}L${CHART_WIDTH / 2}.0 ${CHART_HEIGHT / 2}.0L${CHART_WIDTH}.0 0.0`)
  })

  it('downsamples long series but keeps the last point', () => {
    const points = Array.from({ length: 1000 }, (_, i) => ({
      date: new Date(Date.UTC(2022, 0, 1 + i)).toISOString().slice(0, 10),
      total: i,
      increase: 1
    }))
    const path = totalsPath(points, 100)
    expect(path.split('L').length).toBeLessThanOrEqual(102)
    expect(path.endsWith(' 0.0')).toBe(true)
  })
})

describe('warDuration', () => {
  it('counts years, months and days from 24 Feb 2022', () => {
    expect(warDuration('2022-02-24')).toEqual({ years: 0, months: 0, days: 0 })
    expect(warDuration('2026-11-05')).toEqual({ years: 4, months: 8, days: 12 })
    expect(warDuration('2023-02-24')).toEqual({ years: 1, months: 0, days: 0 })
  })

  it('borrows days from the previous month', () => {
    expect(warDuration('2022-03-01')).toEqual({ years: 0, months: 0, days: 5 })
  })

  it('is null before the start or for a bad date', () => {
    expect(warDuration('2022-02-23')).toBeNull()
    expect(warDuration('soon')).toBeNull()
  })
})
