import type { RetouchStroke } from '@carplates/shared'
import sharp from 'sharp'

import { SHARE_MAX_SIDE } from './helpers.js'

const MAX_INPUT_PIXELS = 50_000_000
/** A stroke is obscured like a face box in `services/alpr/anonymize.py` `_obscure`: pixelated, then blurred. */
const PIXEL_BLOCKS = 50

type Raw = { data: Buffer; width: number; height: number }

async function toRaw(input: Buffer, size?: { width: number; height: number }): Promise<Raw> {
  const img = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).removeAlpha()
  const { data, info } = await (
    size
      ? img.resize({ width: size.width, height: size.height, fit: 'fill' })
      : img.resize({ width: SHARE_MAX_SIDE, height: SHARE_MAX_SIDE, fit: 'inside', withoutEnlargement: true })
  )
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

const rawInput = (r: Raw, channels: 3 | 4) => ({ raw: { width: r.width, height: r.height, channels } })

/** Pixelated + blurred copy of the whole frame, laid under the "add blur" strokes. */
async function obscure(original: Raw): Promise<Raw> {
  const block = Math.max(8, Math.round(Math.max(original.width, original.height) / PIXEL_BLOCKS))
  // Averaging before the downscale keeps fine detail from aliasing into a noisy, still readable patch.
  const tiny = await sharp(original.data, rawInput(original, 3))
    .blur(Math.max(1, block / 2))
    .resize({ width: Math.ceil(original.width / block), height: Math.ceil(original.height / block), fit: 'fill' })
    .raw()
    .toBuffer()
  const data = await sharp(tiny, {
    raw: { width: Math.ceil(original.width / block), height: Math.ceil(original.height / block), channels: 3 }
  })
    .resize({ width: original.width, height: original.height, fit: 'fill', kernel: 'nearest' })
    .blur(Math.max(1, block / 4))
    .raw()
    .toBuffer()
  return { data, width: original.width, height: original.height }
}

/** Consecutive strokes of one mode share a mask. */
function runs(strokes: RetouchStroke[]): RetouchStroke[][] {
  const out: RetouchStroke[][] = []
  for (const stroke of strokes) {
    const last = out[out.length - 1]
    if (last && last[0]?.mode === stroke.mode) last.push(stroke)
    else out.push([stroke])
  }
  return out
}

/** Opaque round-capped strokes on a transparent canvas; the radius is a fraction of the longer side. */
function maskSvg(width: number, height: number, strokes: RetouchStroke[]): Buffer {
  const side = Math.max(width, height)
  const shapes = strokes.map(({ radius, points }) => {
    const r = radius * side
    const pts = points.map(([x, y]) => `${(x * width).toFixed(1)},${(y * height).toFixed(1)}`)
    const [x0, y0] = pts[0]?.split(',') ?? ['0', '0']
    return (
      `<polyline points="${pts.join(' ')}" fill="none" stroke="#fff" stroke-width="${(r * 2).toFixed(1)}" ` +
      `stroke-linecap="round" stroke-linejoin="round"/><circle cx="${x0}" cy="${y0}" r="${r.toFixed(1)}" fill="#fff"/>`
    )
  })
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${shapes.join('')}</svg>`
  )
}

/**
 * The retouched frame, rebuilt from the unblurred upload every time (the client never sends pixels): start from the
 * auto-blurred copy, then per run of strokes either lay the pixelated frame ("add") or the original ("erase") through
 * the strokes' mask. Works at the stored size (<= 1600 px), so a render is a few tens of ms. Returns a JPEG.
 */
export async function renderRetouch(original: Buffer, autoBlurred: Buffer, strokes: RetouchStroke[]): Promise<Buffer> {
  const orig = await toRaw(original)
  const auto = await toRaw(autoBlurred, orig)
  const obscured = strokes.some(s => s.mode === 'add') ? await obscure(orig) : orig
  let current = auto.data
  for (const run of runs(strokes)) {
    const layer = run[0]?.mode === 'add' ? obscured : orig
    const patch = await sharp(layer.data, rawInput(layer, 3))
      .ensureAlpha()
      .composite([{ input: maskSvg(orig.width, orig.height, run), blend: 'dest-in' }])
      .raw()
      .toBuffer()
    current = await sharp(current, rawInput(orig, 3))
      .composite([{ input: patch, raw: { width: orig.width, height: orig.height, channels: 4 }, blend: 'over' }])
      .removeAlpha()
      .raw()
      .toBuffer()
  }
  return sharp(current, rawInput(orig, 3)).jpeg({ quality: 90 }).toBuffer()
}
