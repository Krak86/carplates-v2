import { describe, expect, it } from 'vitest'
import type { AlarmRegion } from '@carplates/shared'

import { sortedAlarms, statusOf } from '@/routes/alarms/helpers'

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
