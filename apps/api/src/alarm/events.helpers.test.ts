import { describe, expect, it } from 'vitest'
import type { ActiveAlarmArea } from '@carplates/shared'

import { buildStats, diffAreas, kyivDay, kyivHour } from './events.helpers.js'
import type { EventRow } from './events.helpers.js'

const area = (areaId: string): ActiveAlarmArea => ({
  areaId,
  region: 'Харківська область',
  name: areaId,
  kind: 'District',
  types: ['AIR'],
  level: 'Red',
  since: null
})

const row = (name: string, start: string, end: string | null, region = 'Харківська область'): EventRow => ({
  areaName: name,
  region,
  startedAt: new Date(start),
  endedAt: end ? new Date(end) : null
})

describe('diffAreas', () => {
  it('opens new areas and closes the ones that left the feed', () => {
    const { toOpen, toClose } = diffAreas(new Set(['a', 'b']), [area('b'), area('c')])
    expect(toOpen.map(a => a.areaId)).toEqual(['c'])
    expect(toClose).toEqual(['a'])
  })
})

describe('Kyiv day and hour', () => {
  it('uses Kyiv time, not UTC', () => {
    // 22:30Z in winter (UTC+2) is already 00:30 of the next Kyiv day.
    expect(kyivDay(new Date('2026-11-03T22:30:00Z'))).toBe('2026-11-04')
    expect(kyivHour(new Date('2026-11-03T22:30:00Z'))).toBe(0)
    expect(kyivHour(new Date('2026-11-04T14:05:00Z'))).toBe(16)
  })
})

describe('buildStats', () => {
  const now = new Date('2026-11-04T21:42:00Z') // 23:42 Kyiv
  const rows = [
    row('A', '2026-11-04T10:00:00Z', '2026-11-04T10:30:00Z'), // 12:00 Kyiv, 30 min
    row('B', '2026-11-04T14:05:00Z', '2026-11-04T16:05:00Z', 'Київська область'), // 16:05, 2 h
    row('C', '2026-11-04T21:00:00Z', null), // 23:00, ongoing 42 min
    row('D', '2026-11-03T10:00:00Z', '2026-11-03T11:00:00Z'), // previous day
    row('Perm', '2022-12-11T00:22:00Z', null) // long before today
  ]

  it('counts today by start day, hour and region; ignores older starts', () => {
    const s = buildStats(
      rows.filter(r => r.areaName !== 'Perm'),
      new Date('2026-10-01T00:00:00Z'),
      now
    )
    expect(s.day).toBe('2026-11-04')
    expect(s.total).toBe(3)
    expect(s.previousTotal).toBe(1)
    expect(s.byHour[12]).toBe(1)
    expect(s.byHour[16]).toBe(1)
    expect(s.byHour[23]).toBe(1)
    expect(s.byRegion[0]).toEqual({ region: 'Харківська область', count: 2 })
    expect(s.longest?.name).toBe('B')
    expect(s.shortest?.name).toBe('A')
    expect(s.shortest?.ongoing).toBe(false)
  })

  it('has no previous-day total while the recorder did not cover that whole day', () => {
    expect(buildStats(rows, new Date('2026-11-03T08:00:00Z'), now).previousTotal).toBeNull()
  })

  it('is empty before anything was recorded', () => {
    const s = buildStats([], null, now)
    expect(s.recordingSince).toBeNull()
    expect(s.total).toBe(0)
    expect(s.longest).toBeNull()
    expect(s.byHour).toHaveLength(24)
  })
})
