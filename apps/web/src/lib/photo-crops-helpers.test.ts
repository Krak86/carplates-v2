import { describe, expect, it } from 'vitest'
import type { PlateCandidate } from '@carplates/shared'

import {
  cropRect,
  dedupeBoxes,
  isFastConnection,
  mergeReads,
  ownReads,
  planTiles,
  settlePool,
  toPhotoBoxes
} from './photo-crops-helpers'

const box = (x1: number, y1: number, x2: number, y2: number, score = 0.9) => ({ x1, y1, x2, y2, score })
const read = (plate: string, b?: { x: number; y: number; w: number; h: number }): PlateCandidate => ({
  plate,
  raw: plate,
  score: 0.9,
  ...(b ? { box: b } : {})
})

describe('planTiles', () => {
  it('uses the frame alone for a small photo', () => {
    expect(planTiles(1200, 800)).toEqual([{ x: 0, y: 0, w: 1200, h: 800 }])
  })

  it('adds overlapping tiles inside the photo for a big one', () => {
    const tiles = planTiles(4000, 3000)
    expect(tiles[0]).toEqual({ x: 0, y: 0, w: 4000, h: 3000 })
    expect(tiles.length).toBeGreaterThan(4)
    expect(tiles.length).toBeLessThanOrEqual(11)
    for (const t of tiles) {
      expect(t.x + t.w).toBeLessThanOrEqual(4000)
      expect(t.y + t.h).toBeLessThanOrEqual(3000)
    }
  })
})

describe('dedupeBoxes', () => {
  it('keeps the more confident of two boxes on the same plate, biggest first', () => {
    const out = dedupeBoxes([box(10, 10, 50, 30, 0.6), box(12, 11, 52, 31, 0.9), box(200, 200, 400, 300, 0.8)])
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({ x1: 200 })
    expect(out[1]).toMatchObject({ score: 0.9 })
  })
})

describe('cropRect', () => {
  it('pads the box and stays inside the image', () => {
    const r = cropRect(box(0, 90, 100, 100), 120, 110, 0.5)
    expect(r.x).toBe(0)
    expect(r.x + r.w).toBeLessThanOrEqual(120)
    expect(r.y + r.h).toBeLessThanOrEqual(110)
  })
})

describe('ownReads', () => {
  const mine = { x: 0.4, y: 0.4, w: 0.2, h: 0.2 }
  const other = { x: 0.8, y: 0.1, w: 0.2, h: 0.1 }

  it('keeps the group nearest the crop centre, alternatives included', () => {
    const out = ownReads([read('AA1111AA', mine), read('AA1111AB', mine), read('BB2222BB', other)], 0.5, 0.5)
    expect(out.map(c => c.plate)).toEqual(['AA1111AA', 'AA1111AB'])
  })

  it('returns box-less reads untouched', () => {
    expect(ownReads([read('AA1111AA'), read('BB2222BB')], 0.5, 0.5)).toHaveLength(2)
  })
})

describe('toPhotoBoxes', () => {
  it('maps crop fractions into photo fractions', () => {
    const [c] = toPhotoBoxes([read('AA1111AA', { x: 0.5, y: 0.5, w: 0.5, h: 0.5 })], { x: 0.2, y: 0.1, w: 0.4, h: 0.2 })
    expect(c!.box!.x).toBeCloseTo(0.4)
    expect(c!.box!.y).toBeCloseTo(0.2)
    expect(c!.box!.w).toBeCloseTo(0.2)
    expect(c!.box!.h).toBeCloseTo(0.1)
  })
})

describe('mergeReads', () => {
  it('drops a plate the earlier crop already covered', () => {
    const a = { x: 0.1, y: 0.1, w: 0.2, h: 0.1 }
    const out = mergeReads([
      [read('AA1111AA', a)],
      [read('AA1111AB', { ...a, x: 0.11 })],
      [read('BB2222BB', { x: 0.6, y: 0.6, w: 0.2, h: 0.1 })]
    ])
    expect(out.map(c => c.plate)).toEqual(['AA1111AA', 'BB2222BB'])
  })
})

describe('settlePool', () => {
  it('limits concurrency and keeps order', async () => {
    let running = 0
    let peak = 0
    const out = await settlePool([1, 2, 3, 4, 5], 2, async n => {
      running++
      peak = Math.max(peak, running)
      await new Promise(r => setTimeout(r, 5))
      running--
      if (n === 3) throw new Error('x')
      return n * 2
    })
    expect(peak).toBe(2)
    expect(out.map(r => r.status)).toEqual(['fulfilled', 'fulfilled', 'rejected', 'fulfilled', 'fulfilled'])
    expect(out[4]).toMatchObject({ value: 10 })
  })
})

describe('isFastConnection', () => {
  it('treats wifi, ethernet and a 10+ Mbps 4g link as fast', () => {
    expect(isFastConnection({ type: 'wifi', effectiveType: '4g', downlink: 3 })).toBe(true)
    expect(isFastConnection({ type: 'ethernet' })).toBe(true)
    expect(isFastConnection({ type: 'cellular', effectiveType: '4g', downlink: 10 })).toBe(true)
  })

  it('treats a slow, saving or unknown link as not fast', () => {
    expect(isFastConnection({ type: 'cellular', effectiveType: '4g', downlink: 4.5 })).toBe(false)
    expect(isFastConnection({ effectiveType: '3g', downlink: 10 })).toBe(false)
    expect(isFastConnection({ type: 'wifi', effectiveType: '4g', saveData: true })).toBe(false)
    expect(isFastConnection({ type: 'wifi', effectiveType: '2g' })).toBe(false)
    expect(isFastConnection({})).toBe(false)
    expect(isFastConnection(undefined)).toBe(false)
  })
})
