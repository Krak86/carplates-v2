import { describe, expect, it } from 'vitest'
import type { AlarmHistoryRegion } from '@carplates/shared'

import {
  estimatedShare,
  historyMapRows,
  historyTotals,
  joinHistory,
  sortByTimeUnderAlert,
  splitDuration
} from '@/routes/alarms/history-helpers'

const alert = (region: string, alerts: number, seconds: number, estimatedAlerts = 0): AlarmHistoryRegion => ({
  region,
  alerts,
  seconds,
  longestSeconds: seconds,
  estimatedAlerts
})

describe('alarm history helpers', () => {
  it('joins crashes by region and leaves null where the DTP year has no row', () => {
    const crash = { region: 'Львівська область', crashes: 10, deaths: 2 } as never
    const rows = joinHistory([alert('Львівська область', 3, 100), alert('Київ', 1, 50)], [crash])
    expect(rows.map(r => [r.crashes, r.deaths])).toEqual([
      [10, 2],
      [null, null]
    ])
    expect(joinHistory([alert('Київ', 1, 50)], undefined)[0]?.crashes).toBeNull()
  })

  it('sorts by total time under alert, then by name', () => {
    const rows = joinHistory([alert('Б', 1, 10), alert('А', 1, 10), alert('В', 9, 99)], [])
    expect(sortByTimeUnderAlert(rows).map(r => r.region)).toEqual(['В', 'А', 'Б'])
  })

  it('splits a duration into hours and minutes', () => {
    expect(splitDuration(5400)).toEqual({ hours: 1, minutes: 30 })
    expect(splitDuration(30)).toEqual({ hours: 0, minutes: 1 })
  })

  it('computes the estimated share, null without alerts', () => {
    expect(estimatedShare([alert('А', 3, 1, 1), alert('Б', 1, 1, 1)])).toBe(0.5)
    expect(estimatedShare([])).toBeNull()
  })

  it('builds map rows in hours (one decimal) or alerts', () => {
    expect(historyMapRows([alert('А', 4, 5400)], 'hours')).toEqual([{ label: 'А', value: 1.5 }])
    expect(historyMapRows([alert('А', 4, 5400)], 'alerts')).toEqual([{ label: 'А', value: 4 }])
  })

  it('sums totals', () => {
    expect(historyTotals([alert('А', 2, 10), alert('Б', 3, 20)])).toEqual({ alerts: 5, seconds: 30 })
  })
})
