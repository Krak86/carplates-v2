import { describe, expect, it } from 'vitest'
import type { AlarmRegion } from '@carplates/shared'

import {
  daysAgo,
  filterAlarmRegions,
  formatAlarmDuration,
  regionRows,
  sortedAlarms,
  statusOf
} from '@/routes/alarms/helpers'

const region = (name: string, scope: 'full' | 'partial'): AlarmRegion => ({
  region: name,
  scope,
  types: ['AIR'],
  level: 'Red',
  updatedAt: null,
  areas: []
})

describe('alarm helpers', () => {
  const regions = [region('Київ', 'partial'), region('АР Крим', 'full')]

  it('reads the status of a region, none when it has no alert', () => {
    expect(statusOf(regions, 'АР Крим')).toBe('full')
    expect(statusOf(regions, 'Київ')).toBe('partial')
    expect(statusOf(regions, 'Львівська область')).toBe('none')
    expect(statusOf(regions, undefined)).toBe('none')
  })

  it('lists full alerts before partial ones', () => {
    expect(sortedAlarms(regions).map(r => r.region)).toEqual(['АР Крим', 'Київ'])
  })
})

describe('alert list helpers', () => {
  const units = { d: 'd', h: 'h', m: 'm' }

  it('formats durations', () => {
    expect(formatAlarmDuration(25 * 60_000, units)).toBe('25 m')
    expect(formatAlarmDuration(74 * 60_000, units)).toBe('1 h 14 m')
    expect(formatAlarmDuration((1440 + 15 * 60 + 3) * 60_000, units)).toBe('1 d 15 h 3 m')
    expect(formatAlarmDuration(60 * 60_000, units)).toBe('1 h')
    expect(formatAlarmDuration(20_000, units)).toBe('0 m')
  })

  it('counts Kyiv days between start and now', () => {
    // 22:30Z is already the next Kyiv day in winter (UTC+2).
    expect(daysAgo('2026-11-03T22:30:00Z', '2026-11-04T10:00:00Z')).toBe(0)
    expect(daysAgo('2026-11-03T10:00:00Z', '2026-11-04T10:00:00Z')).toBe(1)
  })

  it('sorts areas newest first and filters by area or region name', () => {
    const r: AlarmRegion = {
      ...region('Харківська область', 'partial'),
      areas: [
        { name: 'Ізюмський район', kind: 'District', types: ['AIR'], since: '2026-11-04T10:00:00Z' },
        { name: 'Харківський район', kind: 'District', types: ['AIR'], since: '2026-11-04T12:00:00Z' },
        { name: 'Без часу', kind: 'District', types: ['AIR'] }
      ]
    }
    expect(regionRows(r).map(x => x.area.name)).toEqual(['Харківський район', 'Ізюмський район', 'Без часу'])
    expect(filterAlarmRegions([r], 'ізюм', s => s)[0]?.areas).toHaveLength(1)
    expect(filterAlarmRegions([r], 'харківська', s => s)[0]?.areas).toHaveLength(3)
    expect(filterAlarmRegions([r], 'xyz', s => s)).toEqual([])
  })
})
