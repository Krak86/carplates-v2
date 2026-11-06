import { describe, expect, it } from 'vitest'

import { recoveryMarkers, sharePercent } from '@/routes/alarms/recovery-helpers'

const row = (region: string, projects: number, committedUah: number) => ({
  region,
  projects,
  committedUah,
  byStatus: {},
  byType: {}
})

const centers = new Map<string, readonly [number, number]>([
  ['Київ', [10, 10]],
  ['Одеська область', [20, 20]]
])

describe('recoveryMarkers', () => {
  it('skips regions without a centre or a positive value and sorts biggest first', () => {
    const markers = recoveryMarkers(
      [row('Київ', 5, 0), row('Одеська область', 20, 100), row('Невідома область', 9, 9)],
      centers,
      'projects'
    )
    expect(markers.map(m => m.region)).toEqual(['Одеська область', 'Київ'])
    expect(markers[0]?.r).toBeGreaterThan(markers[1]?.r ?? 0)
  })

  it('uses the funding metric when asked', () => {
    const markers = recoveryMarkers([row('Київ', 5, 0), row('Одеська область', 1, 100)], centers, 'funds')
    expect(markers.map(m => m.region)).toEqual(['Одеська область'])
  })

  it('returns nothing when every value is zero', () => {
    expect(recoveryMarkers([row('Київ', 0, 0)], centers, 'projects')).toEqual([])
  })
})

describe('sharePercent', () => {
  it('rounds and guards the empty whole', () => {
    expect(sharePercent(1, 3)).toBe(33)
    expect(sharePercent(1, 0)).toBeNull()
  })
})
