import { describe, expect, it } from 'vitest'

import {
  intervalsFromOfficial,
  intervalsFromVolunteer,
  mergeIntervals,
  parseTimestamp,
  regionOf,
  rollupByDay
} from './alarm-history-parse.js'

const K = 'Харківська область'

describe('regionOf', () => {
  it('maps the dataset names to plate-region names', () => {
    expect(regionOf('Kyiv City')).toBe('Київ')
    expect(regionOf('Kharkivska oblast')).toBe(K)
    expect(regionOf('Narnia')).toBeUndefined()
  })
})

describe('parseTimestamp', () => {
  it('reads the dataset format and rejects junk', () => {
    expect(parseTimestamp('2022-03-15 16:10:34+00:00')).toBe(Date.parse('2022-03-15T16:10:34Z'))
    expect(parseTimestamp('')).toBeUndefined()
    expect(parseTimestamp('nope')).toBeUndefined()
  })
})

describe('mergeIntervals', () => {
  it('merges overlapping and touching intervals and keeps the estimate flag', () => {
    const merged = mergeIntervals([
      { region: K, start: 10, end: 20, estimated: false },
      { region: K, start: 15, end: 30, estimated: true },
      { region: K, start: 30, end: 40, estimated: false },
      { region: K, start: 100, end: 110, estimated: false }
    ])
    expect(merged).toEqual([
      { region: K, start: 10, end: 40, estimated: true },
      { region: K, start: 100, end: 110, estimated: false }
    ])
  })
})

describe('rollupByDay', () => {
  it('counts overlapping raion rows as one period per oblast', () => {
    const { intervals } = intervalsFromOfficial([
      {
        oblast: 'Kharkivska oblast',
        started_at: '2026-09-07 05:00:00+00:00',
        finished_at: '2026-09-07 05:30:00+00:00'
      },
      {
        oblast: 'Kharkivska oblast',
        started_at: '2026-09-07 05:10:00+00:00',
        finished_at: '2026-09-07 05:40:00+00:00'
      },
      { oblast: 'Kharkivska oblast', started_at: '2026-09-07 09:00:00+00:00', finished_at: '2026-09-07 09:10:00+00:00' }
    ])
    expect(rollupByDay('official', intervals)).toEqual([
      {
        region: K,
        source: 'official',
        day: '2026-09-07',
        alerts: 2,
        seconds: 3000,
        longestSeconds: 2400,
        estimatedAlerts: 0
      }
    ])
  })

  it('flags naive volunteer rows as estimated and skips unusable rows', () => {
    const { intervals, skipped } = intervalsFromVolunteer([
      {
        region: 'Kyiv City',
        started_at: '2022-02-25 16:36:22+00:00',
        finished_at: '2022-02-25 17:06:22+00:00',
        naive: 'True'
      },
      { region: 'Kyiv City', started_at: '2022-02-26 01:00:00+00:00', finished_at: '', naive: 'False' },
      {
        region: 'Crimea',
        started_at: '2022-02-26 01:00:00+00:00',
        finished_at: '2022-02-26 02:00:00+00:00',
        naive: 'False'
      }
    ])
    expect(skipped).toBe(2)
    expect(rollupByDay('volunteer', intervals)).toEqual([
      {
        region: 'Київ',
        source: 'volunteer',
        day: '2022-02-25',
        alerts: 1,
        seconds: 1800,
        longestSeconds: 1800,
        estimatedAlerts: 1
      }
    ])
  })
})
