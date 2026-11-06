import { labOf, PAINT_HEX } from '@carplates/shared'
import type { WikiRecolor } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import { coverRect, paintLayer, wikiRecolorTarget } from '@/components/wiki-recolor.helpers'

const URL = 'https://upload.example/car.jpg'
const recolor: WikiRecolor = {
  imageUrl: URL,
  bucket: 'white',
  lab: [...labOf(PAINT_HEX.white)] as [number, number, number],
  maskUrl: '/api/wiki/paint/abc.webp?v=1',
  w: 640,
  h: 360
}

describe('wikiRecolorTarget', () => {
  it('returns the registry colour for a photo of another paint', () => {
    expect(wikiRecolorTarget(recolor, 'ЧЕРВОНИЙ', URL)).toBe('red')
  })

  it('skips without a scan', () => {
    expect(wikiRecolorTarget(null, 'ЧЕРВОНИЙ', URL)).toBeNull()
    expect(wikiRecolorTarget(undefined, 'ЧЕРВОНИЙ', URL)).toBeNull()
  })

  it('skips without a registry colour or an unknown one', () => {
    expect(wikiRecolorTarget(recolor, null, URL)).toBeNull()
    expect(wikiRecolorTarget(recolor, '', URL)).toBeNull()
    expect(wikiRecolorTarget(recolor, 'NO SUCH COLOUR', URL)).toBeNull()
  })

  it('skips when the registry colour is close to the photographed paint', () => {
    expect(wikiRecolorTarget(recolor, 'БІЛИЙ', URL)).toBeNull()
  })

  it('skips when the scan belongs to another photo than the one shown', () => {
    expect(wikiRecolorTarget(recolor, 'ЧЕРВОНИЙ', 'https://upload.example/other.jpg')).toBeNull()
    expect(wikiRecolorTarget(recolor, 'ЧЕРВОНИЙ', null)).toBeNull()
  })
})

describe('coverRect', () => {
  it('crops the sides of a wide photo in a narrower box, centred', () => {
    // 640x360 (16:9) into 400x320 (5:4): full height, width 360 * 1.25 = 450 of 640.
    const r = coverRect(640, 360, 400, 320)
    expect(r.sh).toBeCloseTo(360)
    expect(r.sw).toBeCloseTo(450)
    expect(r.sx).toBeCloseTo(95)
    expect(r.sy).toBeCloseTo(0)
  })

  it('crops top and bottom of a photo that is narrower than the box', () => {
    // 640x480 (4:3) into 800x320 (5:2): full width, height 640 / 2.5 = 256 of 480.
    const r = coverRect(640, 480, 800, 320)
    expect(r.sw).toBeCloseTo(640)
    expect(r.sh).toBeCloseTo(256)
    expect(r.sx).toBeCloseTo(0)
    expect(r.sy).toBeCloseTo(112)
  })

  it('shows the whole photo when the aspect ratios match, and survives a zero box', () => {
    expect(coverRect(640, 360, 320, 180)).toEqual({ sx: 0, sy: 0, sw: 640, sh: 360 })
    expect(coverRect(640, 360, 0, 0)).toEqual({ sx: 0, sy: 0, sw: 640, sh: 360 })
  })
})

describe('paintLayer', () => {
  it('copies the mask alpha, paints visible pixels and leaves transparent ones empty', () => {
    // pixel 0: shade 85 (g = 1), alpha 200; pixel 1: alpha 0.
    const out = paintLayer(new Uint8ClampedArray([85, 85, 85, 200, 85, 85, 85, 0]), 'red')
    expect(out[3]).toBe(200)
    expect(out[0]).toBeGreaterThan(out[1]!) // red target: R above G and B
    expect(out[0]).toBeGreaterThan(out[2]!)
    expect([...out.slice(4)]).toEqual([0, 0, 0, 0])
  })
})
