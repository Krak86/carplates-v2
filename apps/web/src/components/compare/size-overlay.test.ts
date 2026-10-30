import { describe, expect, it } from 'vitest'

import type { VehicleSize } from '@/components/size/use-vehicle-size'

import { buildScene, drawnCar, viewsFor } from './size-overlay'
import type { DrawnCar } from './size-overlay'

const car = (lengthMm: number, widthMm: number, heightMm: number): DrawnCar => ({
  shape: 'car',
  lengthMm,
  widthMm,
  heightMm,
  wheelbaseMm: null
})

const fig = (value: number, source: string): { value: number; source: string } => ({ value, source })
const size = (source: string): VehicleSize =>
  ({
    shape: 'car',
    figures: { lengthMm: fig(4500, 'rdw'), widthMm: fig(1800, 'rdw'), heightMm: fig(1500, source), wheelbaseMm: null }
  }) as unknown as VehicleSize

describe('drawnCar', () => {
  it('needs all three sizes from data', () => {
    expect(drawnCar(size('rdw'))).toMatchObject({ lengthMm: 4500, heightMm: 1500, wheelbaseMm: null })
    expect(drawnCar(size('estimate'))).toBeNull()
    expect(drawnCar(null)).toBeNull()
  })
})

describe('viewsFor', () => {
  it('draws all three views, or two without a front drawing, or the one chosen', () => {
    expect(viewsFor('all', true)).toEqual(['side', 'top', 'front'])
    expect(viewsFor('all', false)).toEqual(['side', 'top'])
    expect(viewsFor('top', true)).toEqual(['top'])
    expect(viewsFor('front', false)).toEqual(['side'])
  })
})

describe('buildScene', () => {
  const pair = [car(4000, 1700, 1400), car(4600, 1850, 1700)] as const

  it('overlay (side): both stand on the same ground, rear bumpers aligned, separate dimension rows', () => {
    const [panel] = buildScene(pair, ['side'], 'overlay').panels
    expect(panel?.at[0]).toEqual({ x: 0, y: 300 })
    expect(panel?.at[1]).toEqual({ x: 0, y: 0 })
    expect(panel?.dimRow).toEqual([0, 1])
  })

  it('overlay (top): centred on one axis', () => {
    const [panel] = buildScene(pair, ['top'], 'overlay').panels
    expect((panel?.at[0].y ?? 0) + 1700 / 2).toBeCloseTo((panel?.at[1].y ?? 0) + 1850 / 2)
  })

  it('front view centres each car on the same vertical axis', () => {
    const [panel] = buildScene(pair, ['front'], 'overlay').panels
    expect((panel?.at[0].x ?? 0) + 1700 / 2).toBeCloseTo((panel?.at[1].x ?? 0) + 1850 / 2)
  })

  it('in place draws on the same spot, arrows still on separate rows', () => {
    const [panel] = buildScene(pair, ['side'], 'inplace').panels
    expect(panel?.at[0].y).toBe(300)
    expect(panel?.dimRow).toEqual([0, 1])
  })

  it('beside: B starts to the right of A, each with its own arrow row', () => {
    const { panels, viewBox } = buildScene(pair, ['side'], 'beside')
    expect(panels[0]?.at[1].x).toBeGreaterThan(4000)
    expect(panels[0]?.dimRow).toEqual([0, 0])
    expect(viewBox[2]).toBeGreaterThan(4000 + 4600)
  })

  it('beside (front view): B starts after the width of A', () => {
    const { panels } = buildScene(pair, ['front'], 'beside')
    expect(panels[0]?.at[1].x).toBeGreaterThan(1700)
    expect(panels[0]?.at[1].x).toBeLessThan(4000)
  })

  it('stack: B starts below A with room for the arrows between', () => {
    const { panels, viewBox } = buildScene(pair, ['side'], 'stack')
    expect((panels[0]?.at[1].y ?? 0) - (panels[0]?.at[0].y ?? 0)).toBeGreaterThan(1400)
    expect(viewBox[3]).toBeGreaterThan(1400 + 1700)
  })

  it('stacks the panels of the all-views choice without overlap', () => {
    const { panels } = buildScene(pair, ['side', 'top', 'front'], 'overlay')
    const ys = panels.map(p => p.at[1].y)
    expect(ys[1]).toBeGreaterThan((ys[0] ?? 0) + 1700)
    expect(ys[2]).toBeGreaterThan((ys[1] ?? 0) + 1850)
  })
})
