import { describe, expect, it } from 'vitest'

import { safeSourceUrl, toLossesHistory, toLossesResponse } from './losses.helpers.js'

const row = (day: string, tanks: number | undefined, resource: string | null = null) => ({
  day,
  dayNumber: 1,
  resource,
  stats: tanks === undefined ? {} : { tanks },
  increase: tanks === undefined ? {} : { tanks: 2 }
})

describe('losses helpers', () => {
  it('keeps only http(s) source links', () => {
    expect(safeSourceUrl('https://www.facebook.com/x')).toBe('https://www.facebook.com/x')
    expect(safeSourceUrl('javascript:alert(1)')).toBeNull()
    expect(safeSourceUrl(null)).toBeNull()
  })

  it('maps the newest row to the response shape', () => {
    expect(toLossesResponse(row('2026-11-04', 10, 'https://a.b'))).toMatchObject({
      date: '2026-11-04',
      stats: { tanks: 10 },
      sourceUrl: 'https://a.b'
    })
  })

  it('skips days without a value for the category', () => {
    const history = toLossesHistory('tanks', [
      row('2022-02-25', 80),
      row('2022-02-26', undefined),
      row('2022-02-27', 90)
    ])
    expect(history.points.map(p => p.date)).toEqual(['2022-02-25', '2022-02-27'])
    expect(history.points[0]).toEqual({ date: '2022-02-25', total: 80, increase: 2 })
  })
})
