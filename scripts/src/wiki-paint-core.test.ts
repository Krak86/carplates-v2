import { labOf, paintBucketOf } from '@carplates/shared'
import type { VehicleColor } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import type { PaintScanResult } from './wiki-paint-core.js'
import {
  PAINT_SKIP_REASONS,
  SHADE_SCALE,
  applyPaint,
  carComponents,
  gaussianBlur,
  scanPaint
} from './wiki-paint-core.js'

const W = 160
const H = 100

type Rect = [x0: number, y0: number, x1: number, y1: number]
const inRect = (x: number, y: number, [x0, y0, x1, y1]: Rect): boolean => x >= x0 && x < x1 && y >= y0 && y < y1

/** Deterministic pseudo-noise in [-1, 1]. */
const noise = (i: number): number => ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 2 - 1

const CAR: Rect = [20, 25, 140, 85]

type Scene = { rgb: Uint8Array; prob: Uint8Array }

/**
 * A synthetic photo: grey road / sky, a car box with a dark window strip on top, dark wheels at the bottom and a
 * body whose lightness falls off left to right (like a real lit panel). `body(x, y)` returns the body RGB.
 */
function scene(body: (x: number, y: number) => [number, number, number], cars: Rect[] = [CAR]): Scene {
  const rgb = new Uint8Array(W * H * 3)
  const prob = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      let px: [number, number, number] = [128, 130, 134]
      const car = cars.find(r => inRect(x, y, r))
      if (car) {
        const h = car[3] - car[1]
        const fy = (y - car[1]) / h
        if (fy < 0.25) px = [28, 32, 38]
        else if (fy > 0.85) px = [18, 18, 20]
        else {
          const shade = 1.15 - 0.4 * ((x - car[0]) / (car[2] - car[0]))
          px = body(x, y).map(v => Math.min(255, v * shade)) as [number, number, number]
        }
        prob[i] = 255
      }
      for (let k = 0; k < 3; k++) rgb[i * 3 + k] = Math.max(0, Math.min(255, Math.round(px[k]! + noise(i * 3 + k) * 3)))
    }
  }
  return { rgb, prob }
}

const solid = (r: number, g: number, b: number) => (): [number, number, number] => [r, g, b]
const scan = ({ rgb, prob }: Scene): PaintScanResult => scanPaint({ rgb, width: W, height: H, prob })

describe('carComponents', () => {
  it('sorts the largest component first and counts the centre double', () => {
    const prob = new Uint8Array(W * H)
    const fill = (r: Rect): void => {
      for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) prob[y * W + x] = 255
    }
    fill([0, 0, 40, 40]) // big, in the corner
    fill([60, 40, 100, 70]) // smaller, through the centre
    const { comps } = carComponents(prob, W, H)
    expect(comps).toHaveLength(2)
    expect(comps[0]!.area).toBe(1200)
    expect(comps[0]!.center).toBe(true)
    expect(comps[1]!.area).toBe(1600)
  })
})

describe('gaussianBlur', () => {
  it('keeps a flat field flat and spreads an impulse', () => {
    const flat = new Float32Array(25).fill(0.5)
    for (const v of gaussianBlur(flat, 5, 5, 1.1)) expect(v).toBeCloseTo(0.5, 5)
    const dot = new Float32Array(81)
    dot[40] = 1
    const out = gaussianBlur(dot, 9, 9, 1.1)
    expect(out[40]).toBeLessThan(1)
    expect(out[41]).toBeGreaterThan(0)
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 4)
  })
})

describe('scanPaint', () => {
  it('finds the paint of a red car and masks the body but not the road or the glass', () => {
    const r = scan(scene(solid(190, 30, 36)))
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    expect(r.bucket).toBe('red')
    expect(r.bodyArea).toBeCloseTo((120 * 60) / (W * H), 2)
    const alpha = (x: number, y: number): number => r.mask[(y * W + x) * 4 + 3]!
    expect(alpha(80, 60)).toBeGreaterThan(200) // body
    expect(alpha(5, 5)).toBe(0) // road / sky
    expect(alpha(80, 30)).toBeLessThan(40) // window strip
    expect(alpha(80, 80)).toBeLessThan(40) // wheels
  })

  it('stores the body shading relative to the median body luminance', () => {
    const r = scan(scene(solid(190, 30, 36)))
    if (r.status !== 'ok') throw new Error('expected ok')
    const shade = (x: number): number => r.mask[(60 * W + x) * 4]! / SHADE_SCALE
    expect(shade(25)).toBeGreaterThan(shade(135)) // lit side is brighter
    expect(shade(80)).toBeGreaterThan(0.6)
    expect(shade(80)).toBeLessThan(1.6)
  })

  it('recognises the other registry colours from the photo', () => {
    const cases: [VehicleColor, [number, number, number]][] = [
      ['blue', [40, 90, 200]],
      ['green', [46, 125, 50]],
      ['yellow', [240, 195, 0]],
      ['white', [235, 235, 238]]
    ]
    for (const [color, rgb] of cases) {
      const r = scan(scene(solid(...rgb)))
      expect(r.status, color).toBe('ok')
      if (r.status === 'ok') expect(r.bucket, color).toBe(color)
    }
  })

  it('reads a mid grey car as gray, never white', () => {
    const r = scan(scene(solid(150, 152, 156)))
    if (r.status !== 'ok') throw new Error('expected ok')
    expect(r.bucket).toBe('gray')
  })

  it('skips a black car', () => {
    expect(scan(scene(solid(26, 26, 28)))).toMatchObject({ status: 'skip', reason: 'dark_body' })
  })

  it('skips a wrapped / multi-coloured body', () => {
    const rainbow = (x: number): [number, number, number] => {
      const t = ((x - CAR[0]) / (CAR[2] - CAR[0])) * 6
      const stops: [number, number, number][] = [
        [220, 40, 40],
        [230, 200, 30],
        [50, 180, 60],
        [40, 190, 200],
        [50, 70, 210],
        [200, 50, 190]
      ]
      return stops[Math.min(5, Math.floor(t))]!
    }
    expect(scan(scene(rainbow))).toMatchObject({ status: 'skip', reason: 'wrap' })
  })

  it('skips when there is no car, or it is too small or fills the frame', () => {
    const empty = new Uint8Array(W * H)
    expect(scanPaint({ rgb: new Uint8Array(W * H * 3).fill(120), width: W, height: H, prob: empty })).toMatchObject({
      status: 'skip',
      reason: 'no_car',
      bodyArea: null
    })
    const small = scene(solid(190, 30, 36))
    small.prob.fill(0)
    for (let y = 40; y < 50; y++) for (let x = 60; x < 80; x++) small.prob[y * W + x] = 255
    expect(scan(small)).toMatchObject({ status: 'skip', reason: 'car_too_small' })
    const full = scene(solid(190, 30, 36))
    full.prob.fill(255)
    expect(scan(full)).toMatchObject({ status: 'skip', reason: 'car_too_big' })
  })

  it('skips a frame with two comparable cars', () => {
    const r = scan(
      scene(solid(190, 30, 36), [
        [5, 25, 75, 85],
        [85, 25, 155, 85]
      ])
    )
    expect(r).toMatchObject({ status: 'skip', reason: 'multiple_cars' })
  })

  it('only uses documented skip reasons', () => {
    expect(PAINT_SKIP_REASONS).toContain('wrap')
  })
})

describe('applyPaint', () => {
  it('recolours the body to the target hue, keeps shading and leaves the background alone', () => {
    const s = scene(solid(190, 30, 36))
    const r = scan(s)
    if (r.status !== 'ok') throw new Error('expected ok')
    const out = applyPaint(s.rgb, r.mask, 'blue')
    const px = (a: Uint8Array, x: number, y: number): number[] => [...a.slice((y * W + x) * 3, (y * W + x) * 3 + 3)]
    const body = px(out, 80, 60)
    expect(body[2]).toBeGreaterThan(body[0]! + 30) // blue now
    expect(paintBucketOf(labOf([body[0]!, body[1]!, body[2]!]))).toBe('blue')
    expect(px(out, 5, 5)).toEqual(px(s.rgb, 5, 5)) // background untouched
    expect(px(out, 80, 80)).toEqual(px(s.rgb, 80, 80)) // wheels untouched
    expect(px(out, 25, 60)[2]).toBeGreaterThan(px(out, 135, 60)[2]!) // shading kept
  })

  it('accepts a hex target and does not mutate the input', () => {
    const s = scene(solid(190, 30, 36))
    const r = scan(s)
    if (r.status !== 'ok') throw new Error('expected ok')
    const copy = Uint8Array.from(s.rgb)
    const out = applyPaint(s.rgb, r.mask, '#2e7d32')
    expect(s.rgb).toEqual(copy)
    expect(out[(60 * W + 80) * 3 + 1]).toBeGreaterThan(out[(60 * W + 80) * 3]!)
  })
})

describe('dark body gate', () => {
  it('skips a dark car even when it has a bright lit patch', () => {
    const s = scene((x, y) => (x < 60 && y < 50 ? [225, 225, 228] : [28, 28, 30]))
    expect(scan(s)).toMatchObject({ status: 'skip' })
    expect(['dark_body', 'dark_neutral']).toContain((scan(s) as { reason: string }).reason)
  })
})
