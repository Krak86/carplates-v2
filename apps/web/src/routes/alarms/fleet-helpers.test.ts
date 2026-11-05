import { describe, expect, it } from 'vitest'

import { niceMax, scatterPoints, tickCount } from '@/routes/alarms/fleet-helpers'

const alert = (region: string, seconds: number) => ({ region, seconds, alerts: 1, estimatedAlerts: 0 }) as never
const facet = (region: string, fleet: number, electric: number) =>
  ({ region, fleet, models: [], origins: [], fuels: [{ value: 'electric', n: electric }] }) as never

describe('scatterPoints', () => {
  it('joins by region and turns seconds into hours and counts into a share', () => {
    const [p] = scatterPoints([alert('A', 7200)], [facet('A', 200, 10)], 'electric')
    expect(p).toEqual({ region: 'A', share: 0.05, hours: 2, fleet: 200 })
  })

  it('leaves out regions missing a side or with an empty fleet', () => {
    const points = scatterPoints(
      [alert('A', 3600), alert('B', 3600), alert('C', 3600)],
      [facet('A', 100, 1), facet('C', 0, 0)],
      'electric'
    )
    expect(points.map(p => p.region)).toEqual(['A'])
  })

  it('counts a missing fuel class as zero share, not as missing', () => {
    const [p] = scatterPoints([alert('A', 3600)], [facet('A', 100, 1)], 'diesel')
    expect(p!.share).toBe(0)
  })
})

describe('tickCount', () => {
  it('gives round steps for 1, 2 and 5 times a power of ten', () => {
    expect(tickCount(0.05)).toBe(5)
    expect(tickCount(2000)).toBe(4)
    expect(tickCount(0.1)).toBe(5)
  })
})

describe('niceMax', () => {
  it('rounds up to 1, 2 or 5 times a power of ten', () => {
    expect(niceMax(0.07)).toBeCloseTo(0.1)
    expect(niceMax(130)).toBe(200)
    expect(niceMax(3400)).toBe(5000)
    expect(niceMax(0)).toBe(1)
  })
})
