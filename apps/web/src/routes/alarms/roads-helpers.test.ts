import { describe, expect, it } from 'vitest'

import { dotRadius, hazardDots, regionRoads } from '@/routes/alarms/roads-helpers'

const hazard = (over: Record<string, unknown> = {}) =>
  ({
    kind: 'hazard',
    region: 'Київська область',
    roadCode: 'М06',
    roadName: 'Київ - Чоп',
    kmStart: 10,
    kmEnd: 12,
    lat: 50.4,
    lon: 30.5,
    crashes3y: 10,
    rate: null,
    hazardLevel: null,
    ...over
  }) as never

const project = (lon: number, lat: number) => [lon, lat] as const

describe('hazardDots', () => {
  it('skips missing and implausible coordinates', () => {
    const dots = hazardDots(
      [
        hazard(),
        hazard({ lat: null }),
        hazard({ lon: null }),
        hazard({ lat: 0, lon: 0 }),
        hazard({ lat: 30.5, lon: 50.4 })
      ],
      project
    )
    expect(dots).toHaveLength(1)
  })

  it('skips points the map cannot project and draws the biggest first', () => {
    expect(hazardDots([hazard()], () => null)).toHaveLength(0)
    const dots = hazardDots([hazard({ crashes3y: 1 }), hazard({ crashes3y: 40 })], project)
    expect(dots[0]!.r).toBeGreaterThan(dots[1]!.r)
  })
})

describe('dotRadius', () => {
  it('grows with crashes and is capped', () => {
    expect(dotRadius(null)).toBe(dotRadius(0))
    expect(dotRadius(15)).toBeGreaterThan(dotRadius(0))
    expect(dotRadius(1000)).toBe(dotRadius(30))
  })
})

describe('regionRoads', () => {
  const rows = [{ region: 'Київська область', deaths: 7, crashes: 40 }] as never
  it('is null for a region without data', () => {
    expect(regionRoads('Львівська область', rows, [])).toBeNull()
  })
  it('counts sections and those without a usable coordinate', () => {
    const r = regionRoads('Київська область', rows, [hazard(), hazard({ lat: null }), hazard({ region: 'Інша' })])
    expect(r).toEqual({ deaths: 7, crashes: 40, hazards: 2, withoutCoordinates: 1 })
  })
})
