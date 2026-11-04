import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { AlarmRegion } from '@carplates/shared'

import { areaTarget, indexLayer, oblastOfRegion, planAlarmPaint, regionOfOblast } from '@/routes/alarms/geo-match'
import type { AlarmGeoProperties } from '@/routes/alarms/geo-match'

const load = (layer: string): { properties: AlarmGeoProperties }[] =>
  (
    JSON.parse(readFileSync(`public/ukraine-alarm-${layer}.geojson`, 'utf8')) as {
      features: { properties: AlarmGeoProperties }[]
    }
  ).features

const area = (name: string, kind: string, level = 'Red') => ({ name, kind, types: ['AIR'], level })

describe('region names', () => {
  it('round-trips plate region and COD oblast names', () => {
    for (const region of ['АР Крим', 'Київ', 'Севастополь', 'Харківська область']) {
      expect(regionOfOblast(oblastOfRegion(region))).toBe(region)
    }
  })
})

describe('areaTarget', () => {
  it('places raions and communities, not whole-oblast entries', () => {
    expect(areaTarget('Сумська область', { name: 'Сумський район' })?.layer).toBe('raions')
    expect(areaTarget('Харківська область', { name: 'м. Харків та Харківська територіальна громада' })?.layer).toBe(
      'hromadas'
    )
    expect(areaTarget('Луганська область', { name: 'Луганська область' })).toBeNull()
  })
})

describe('shape files', () => {
  const raions = indexLayer(load('raions'))
  const hromadas = indexLayer(load('hromadas'))

  it('has the 27 oblast units', () => {
    expect(load('oblasts')).toHaveLength(27)
  })

  it('places every area of a real mixed alert on a shape (no fallback)', () => {
    const regions: AlarmRegion[] = [
      {
        region: 'Дніпропетровська область',
        scope: 'partial',
        types: ['AIR'],
        level: 'Red',
        areas: [
          area('Покровська територіальна громада', 'Community'),
          area('м. Марганець та Марганецька територіальна громада', 'Community'),
          area('м. Нікополь та Нікопольська територіальна громада', 'Community'),
          area('Синельниківський район', 'District'),
          area('Павлоградський район', 'District', 'Yellow'),
          area('Кам’янський район', 'District', 'Yellow')
        ]
      },
      {
        region: 'Харківська область',
        scope: 'partial',
        types: ['AIR'],
        level: 'Red',
        areas: [
          area('Вовчанська територіальна громада', 'Community'),
          area('м. Харків та Харківська територіальна громада', 'State'),
          area('Лозівський район', 'District', 'Yellow')
        ]
      }
    ] as AlarmRegion[]
    const plan = planAlarmPaint(regions, { raions, hromadas })
    expect(plan.oblasts.size).toBe(0)
    expect(plan.shapes).toHaveLength(9)
    expect(plan.shapes.filter(s => s.level === 'Yellow')).toHaveLength(3)
  })

  it('falls back to the whole oblast when an area has no shape (fail closed)', () => {
    const regions = [
      {
        region: 'Сумська область',
        scope: 'partial',
        types: [],
        level: 'Red',
        areas: [area('Невідомий район', 'District')]
      }
    ] as AlarmRegion[]
    expect(planAlarmPaint(regions, { raions, hromadas }).oblasts.get('Сумська')?.kind).toBe('fallback')
  })
})
