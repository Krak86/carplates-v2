import { describe, expect, it } from 'vitest'

import { activeAlarmRegions, alarmRegionName, alarmTypeOf, buildOblastIndex } from './alarm.js'
import type { UpstreamRegionAlerts, UpstreamRegionNode } from './alarm.js'

describe('alarmRegionName', () => {
  it('maps the names that differ from the plate regions', () => {
    expect(alarmRegionName('м. Київ')).toBe('Київ')
    expect(alarmRegionName('м. Севастополь')).toBe('Севастополь')
    expect(alarmRegionName('Автономна Республіка Крим')).toBe('АР Крим')
  })

  it('keeps Kyiv city and Kyiv oblast apart', () => {
    expect(alarmRegionName('Київська область')).toBe('Київська область')
  })

  it('passes matching names through and rejects the rest', () => {
    expect(alarmRegionName('  Львівська   область ')).toBe('Львівська область')
    expect(alarmRegionName('Бучанський район')).toBeUndefined()
  })
})

describe('alarmTypeOf', () => {
  it('falls back to OTHER for unknown kinds', () => {
    expect(alarmTypeOf('air')).toBe('AIR')
    expect(alarmTypeOf('UNKNOWN')).toBe('OTHER')
    expect(alarmTypeOf(null)).toBe('OTHER')
  })
})

const node = (regionId: string, regionName: string, regionType: string, kids: UpstreamRegionNode[] = []) => ({
  regionId,
  regionName,
  regionType,
  regionChildIds: kids
})

const tree: UpstreamRegionNode[] = [
  node('22', 'Харківська область', 'State', [
    node('126', 'Богодухівський район', 'District', [node('1303', 'Коломацька територіальна громада', 'Community')])
  ]),
  node('1293', 'м. Харків та Харківська територіальна громада', 'State'),
  node('31', 'м. Київ', 'State'),
  node('9999', 'Автономна Республіка Крим', 'State'),
  node('0', 'Тестовий регіон', 'State')
]

const entry = (
  regionId: string,
  regionName: string,
  regionType: string,
  types: string[],
  level = 'Red'
): UpstreamRegionAlerts => ({
  regionId,
  regionType,
  regionName,
  lastUpdate: '2026-11-04T10:00:00Z',
  activeAlerts: types.map(type => ({ type, activeAlertLevels: [{ alertLevel: level }] }))
})

describe('buildOblastIndex', () => {
  it('maps every descendant and the oblast cities, and skips unknown states', () => {
    const index = buildOblastIndex(tree)
    expect(index.get('1303')).toEqual({ region: 'Харківська область', isRoot: false })
    expect(index.get('1293')).toEqual({ region: 'Харківська область', isRoot: false })
    expect(index.get('22')).toEqual({ region: 'Харківська область', isRoot: true })
    expect(index.get('31')).toEqual({ region: 'Київ', isRoot: true })
    expect(index.has('0')).toBe(false)
  })
})

describe('activeAlarmRegions', () => {
  const index = buildOblastIndex(tree)

  it('groups district and community alerts under the oblast as partial', () => {
    const [kharkiv] = activeAlarmRegions(
      [
        entry('126', 'Богодухівський район', 'District', ['AIR']),
        entry('1303', 'Коломацька територіальна громада', 'Community', ['ARTILLERY', 'AIR'], 'Yellow'),
        entry('1293', 'м. Харків та Харківська територіальна громада', 'State', ['AIR'], 'Yellow')
      ],
      index
    )
    expect(kharkiv?.region).toBe('Харківська область')
    expect(kharkiv?.scope).toBe('partial')
    expect(kharkiv?.level).toBe('Red')
    expect(kharkiv?.types).toEqual(['AIR', 'ARTILLERY'])
    expect(kharkiv?.areas).toHaveLength(3)
  })

  it('marks a whole-oblast entry as full and keeps every other entry', () => {
    const out = activeAlarmRegions(
      [
        entry('9999', 'Автономна Республіка Крим', 'State', ['AIR']),
        entry('31', 'м. Київ', 'State', ['AIR'], 'Yellow'),
        entry('22', 'Харківська область', 'State', []),
        entry('555', 'Невідомий район', 'District', ['AIR'])
      ],
      index
    )
    expect(out.map(r => [r.region, r.scope, r.level])).toEqual([
      ['АР Крим', 'full', 'Red'],
      ['Київ', 'full', 'Yellow']
    ])
  })
})
