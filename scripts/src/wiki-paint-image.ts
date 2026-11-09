/**
 * Image half of the paint scan, shared by `wiki-paint.ts` (hero photos, with masks) and `wiki-candidates.ts` (extra photos, no masks):
 * SegFormer `car` probability + `scanPaint` on a downloaded photo.
 */
import { join } from 'node:path'

import { env, pipeline, RawImage } from '@huggingface/transformers'
import sharp from 'sharp'

import { PAINT_SCAN_WIDTH, scanPaint } from './wiki-paint-core.js'
import type { PaintScanResult } from './wiki-paint-core.js'

export const PAINT_DATA_DIR = join(import.meta.dirname, '..', '.data', 'wiki-paint')
export const PAINT_USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const MODEL = 'Xenova/segformer-b0-finetuned-ade-512-512'

export type Segmenter = (img: RawImage) => Promise<{ label: string; mask: RawImage }[]>

/** Loads the q8 SegFormer (downloaded once into `.data/wiki-paint/hf-cache`). */
export async function loadSegmenter(): Promise<Segmenter> {
  env.cacheDir = join(PAINT_DATA_DIR, 'hf-cache')
  return (await pipeline('image-segmentation', MODEL, { dtype: 'q8' })) as unknown as Segmenter
}

/** Car probability (0-255) at `w x h`, or null when SegFormer found no `car`. */
async function carProbability(seg: Segmenter, rgb: Uint8Array, w: number, h: number): Promise<Uint8Array | null> {
  const out = await seg(new RawImage(Uint8ClampedArray.from(rgb), w, h, 3))
  const car = out.find(o => o.label === 'car')
  if (!car) return null
  const m = car.mask
  const { data, info } = await sharp(Buffer.from(m.data), { raw: { width: m.width, height: m.height, channels: 1 } })
    .resize(w, h, { kernel: 'cubic' })
    .raw()
    .toBuffer({ resolveWithObject: true })
  // sharp can return extra channels for 1-channel input after resize: always stride by info.channels.
  const prob = new Uint8Array(w * h)
  for (let i = 0; i < prob.length; i++) prob[i] = data[i * info.channels]!
  return prob
}

export async function scanImage(
  seg: Segmenter,
  buf: Buffer
): Promise<{ rgb: Uint8Array; w: number; h: number; scan: PaintScanResult }> {
  const { data, info } = await sharp(buf)
    .resize({ width: PAINT_SCAN_WIDTH })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const rgb = new Uint8Array(data)
  const prob = await carProbability(seg, rgb, info.width, info.height)
  const scan: PaintScanResult = prob
    ? scanPaint({ rgb, width: info.width, height: info.height, prob })
    : { status: 'skip', reason: 'no_car', bodyArea: null }
  return { rgb, w: info.width, h: info.height, scan }
}
