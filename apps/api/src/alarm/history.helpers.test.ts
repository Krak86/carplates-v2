import { describe, expect, it } from 'vitest'

import { buildHistory, pickHistoryYear } from './history.helpers.js'
import type { HistoryRow } from './history.helpers.js'

const row = (region: string, source: string, alerts: number, firstDay: string, lastDay: string): HistoryRow => ({
  region,
  source,
  alerts,
  seconds: alerts * 100,
  longestSeconds: 100,
  estimatedAlerts: 0,
  firstDay,
  lastDay
})

describe('alarm history helpers', () => {
  it('picks the newest year by default and only an existing asked year', () => {
    expect(pickHistoryYear([2023, 2025, 2024, 2025])).toBe(2025)
    expect(pickHistoryYear([2023, 2025], 2023)).toBe(2023)
    expect(pickHistoryYear([2023, 2025], 2022)).toBeNull()
    expect(pickHistoryYear([])).toBeNull()
  })

  it('keeps official and volunteer apart, with their own day range', () => {
    const res = buildHistory(
      2025,
      [2024, 2025],
      [
        row('Львівська область', 'volunteer', 5, '2025-01-02', '2025-12-30'),
        row('Київ', 'official', 3, '2025-01-05', '2025-12-20'),
        row('Волинська область', 'official', 4, '2025-01-01', '2025-12-31')
      ]
    )
    expect(res.years).toEqual([2025, 2024])
    expect(res.sources.map(s => s.source)).toEqual(['official', 'volunteer'])
    const official = res.sources[0]!
    expect(official.regions.map(r => r.region)).toEqual(['Волинська область', 'Київ'])
    expect([official.firstDay, official.lastDay]).toEqual(['2025-01-01', '2025-12-31'])
    expect(res.sources[1]!.regions).toHaveLength(1)
  })

  it('omits a source with no rows', () => {
    expect(buildHistory(2022, [2022], [row('Київ', 'volunteer', 1, '2022-02-25', '2022-02-25')]).sources).toHaveLength(
      1
    )
  })
})
