import type { PlateCandidate } from '@carplates/shared'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { distinctBoxes, drawPlateOutlines } from './outlines.js'

const cand = (plate: string, box?: PlateCandidate['box']): PlateCandidate => ({
  plate,
  raw: plate,
  score: 0.9,
  ...(box && { box })
})

const blank = (): Promise<Buffer> =>
  sharp({ create: { width: 200, height: 100, channels: 3, background: '#808080' } })
    .jpeg()
    .toBuffer()

describe('distinctBoxes', () => {
  it('merges alternative readings that share a box and skips candidates without one', () => {
    const box = { x: 0.1, y: 0.2, w: 0.3, h: 0.1 }
    expect(distinctBoxes([cand('AA1111AA', box), cand('AA1111AB', box), cand('BB2222BB')])).toEqual([box])
  })
})

describe('drawPlateOutlines', () => {
  it('paints the outline and keeps the size', async () => {
    const image = await blank()
    const out = await drawPlateOutlines(image, [cand('AA1111AA', { x: 0.25, y: 0.25, w: 0.5, h: 0.5 })])
    const meta = await sharp(out).metadata()
    expect([meta.width, meta.height]).toEqual([200, 100])
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true })
    // Left edge of the box (x = 50, y = 50) is amber, not the grey background.
    const i = (50 * 200 + 50) * 3
    expect(data[i]).toBeGreaterThan(200)
    expect(data[i + 2]).toBeLessThan(120)
  })

  it('returns the photo untouched when no candidate has a box', async () => {
    const image = await blank()
    expect(await drawPlateOutlines(image, [cand('AA1111AA')])).toBe(image)
  })
})
