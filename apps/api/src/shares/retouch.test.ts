import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { renderRetouch } from './retouch.js'

const W = 400
const H = 200

/** A checkerboard of 4 px squares: strong detail that survives JPEG, so blur is easy to measure. */
async function photo(): Promise<Buffer> {
  const px = Buffer.alloc(W * H * 3)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      px.fill((Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0 ? 255 : 0, (y * W + x) * 3, (y * W + x) * 3 + 3)
  return sharp(px, { raw: { width: W, height: H, channels: 3 } })
    .png()
    .toBuffer()
}

const grey = (): Promise<Buffer> =>
  sharp({ create: { width: W, height: H, channels: 3, background: '#808080' } })
    .png()
    .toBuffer()

/** Max - min of the red channel in a 10 px square: ~255 for the checkerboard, ~0 once blurred. */
async function spread(jpeg: Buffer, x0: number, y0: number): Promise<number> {
  const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true })
  let min = 255
  let max = 0
  for (let y = y0; y < y0 + 10; y++)
    for (let x = x0; x < x0 + 10; x++) {
      const v = data[(y * info.width + x) * info.channels] ?? 0
      min = Math.min(min, v)
      max = Math.max(max, v)
    }
  return max - min
}

describe('renderRetouch', () => {
  it('keeps the auto-blurred frame when there are no strokes', async () => {
    const out = await renderRetouch(await photo(), await grey(), [])
    expect(await spread(out, 10, 10)).toBeLessThan(10)
  })

  it('"add" blurs only under the stroke', async () => {
    const original = await photo()
    const out = await renderRetouch(original, original, [{ mode: 'add', radius: 0.1, points: [[0.25, 0.5]] }])
    expect(await spread(out, 95, 95)).toBeLessThan(60) // inside the brush: the detail is gone
    expect(await spread(out, 350, 95)).toBeGreaterThan(150) // outside: untouched
  })

  it('"erase" brings the original back under the stroke only', async () => {
    const out = await renderRetouch(await photo(), await grey(), [
      { mode: 'erase', radius: 0.1, points: [[0.75, 0.5]] }
    ])
    expect(await spread(out, 295, 95)).toBeGreaterThan(150)
    expect(await spread(out, 20, 95)).toBeLessThan(10)
  })

  it('applies strokes in order: a later erase wins over an earlier add', async () => {
    const original = await photo()
    const out = await renderRetouch(original, original, [
      { mode: 'add', radius: 0.1, points: [[0.5, 0.5]] },
      { mode: 'erase', radius: 0.1, points: [[0.5, 0.5]] }
    ])
    expect(await spread(out, 195, 95)).toBeGreaterThan(150)
  })
})
