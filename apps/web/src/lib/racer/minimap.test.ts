import { describe, expect, it } from 'vitest'

import { BACK, layout, layoutRoad, type MapTrack } from './minimap'

const track = (curve: (i: number) => number): MapTrack => ({
  count: 100,
  halfWidth: 10,
  curve,
  objects: () => [],
  cars: () => []
})

describe('layoutRoad', () => {
  it('puts the car at the origin and draws a straight road upwards', () => {
    layoutRoad(
      track(() => 0),
      10.4
    )
    expect(layout.x[BACK]).toBeCloseTo(0.0)
    expect(layout.y[BACK]).toBeCloseTo(0.4)
    expect(layout.x[BACK + 20]).toBeCloseTo(0)
    expect(layout.y[BACK + 20]).toBeCloseTo(0.4 - 20)
    expect(layout.y[0]).toBeGreaterThan(layout.y[BACK] as number)
  })

  it('bends right for a positive curve and left for a negative one', () => {
    layoutRoad(
      track(() => 4),
      10
    )
    expect(layout.x[BACK + 100]).toBeGreaterThan(5)
    layoutRoad(
      track(() => -4),
      10
    )
    expect(layout.x[BACK + 100]).toBeLessThan(-5)
  })

  it('wraps around the end of the lap', () => {
    const curves = (i: number): number => (i < 5 ? 4 : 0)
    layoutRoad(track(curves), 98)
    expect(layout.x[BACK + 20]).toBeGreaterThan(0.5) // segments 0-4 curve, reached through the wrap
  })
})
