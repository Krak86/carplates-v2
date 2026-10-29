import type { PlateCandidate } from '@carplates/shared'

import type { PlateBox } from './plate-detector-types'

export type Rect = { x: number; y: number; w: number; h: number }

const TILE_OVERLAP = 0.25 // a plate up to ~25% of a tile survives a seam
const TILE_LONG_SIDE = 2400 // above: 3 tiles along the long side; above TILE_MID_SIDE: 2; else the frame alone
const TILE_MID_SIDE = 1400
const MAX_TILES = 10
const DUPLICATE_OVERLAP = 0.5 // intersection / smaller box area above this = the same plate

export const CROP_PAD = 0.35 // context around the box, as a fraction of its size - the server detector wants some margin
export const MAX_CROPS = 6

const area = (b: { x1: number; y1: number; x2: number; y2: number }): number => (b.x2 - b.x1) * (b.y2 - b.y1)

/** Intersection over the smaller box's area (0 when apart): a box inside a bigger one counts as fully overlapping. */
export function overlapOfSmaller(a: PlateBox, b: PlateBox): number {
  const w = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)
  const h = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1)
  if (w <= 0 || h <= 0) return 0
  return (w * h) / Math.min(area(a), area(b))
}

function axisStarts(length: number, tile: number): number[] {
  if (length <= tile) return [0]
  const step = Math.max(1, Math.floor(tile * (1 - TILE_OVERLAP)))
  const count = Math.ceil((length - tile) / step) + 1
  return Array.from({ length: count }, (_, i) => Math.round((i * (length - tile)) / (count - 1)))
}

/** The whole frame first, then overlapping square-ish tiles on big photos so a small or distant plate is seen larger. */
export function planTiles(width: number, height: number): Rect[] {
  const full: Rect = { x: 0, y: 0, w: width, h: height }
  const longest = Math.max(width, height)
  const parts = longest > TILE_LONG_SIDE ? 3 : longest > TILE_MID_SIDE ? 2 : 1
  if (parts === 1) return [full]

  const side = Math.ceil((longest / parts) * (1 + TILE_OVERLAP))
  const tw = Math.min(width, side)
  const th = Math.min(height, side)
  const tiles = [full]
  for (const y of axisStarts(height, th)) for (const x of axisStarts(width, tw)) tiles.push({ x, y, w: tw, h: th })
  return tiles.slice(0, MAX_TILES + 1)
}

/** Boxes from overlapping tiles: of two that cover the same plate keep the more confident, biggest first. */
export function dedupeBoxes(boxes: PlateBox[]): PlateBox[] {
  const kept: PlateBox[] = []
  for (const box of [...boxes].sort((a, b) => b.score - a.score)) {
    if (!kept.some(k => overlapOfSmaller(k, box) >= DUPLICATE_OVERLAP)) kept.push(box)
  }
  return kept.sort((a, b) => area(b) - area(a))
}

/** The box plus padding, clamped to the image, in pixels. */
export function cropRect(box: PlateBox, width: number, height: number, pad = CROP_PAD): Rect {
  const bw = box.x2 - box.x1
  const bh = box.y2 - box.y1
  const x = Math.max(0, box.x1 - bw * pad)
  const y = Math.max(0, box.y1 - bh * pad)
  return {
    x,
    y,
    w: Math.min(width - x, bw * (1 + 2 * pad)),
    h: Math.min(height - y, bh * (1 + 2 * pad))
  }
}

/**
 * The reads of the plate a crop was made for. The crop may show a neighbour's plate too (it has its own crop), so keep
 * only the group of reads sharing the box nearest the detected plate's centre (`cx`, `cy`: fractions of the crop).
 * Reads without a box are kept as they are.
 */
export function ownReads(candidates: PlateCandidate[], cx: number, cy: number): PlateCandidate[] {
  let nearest: PlateCandidate | undefined
  let nearestDist = Infinity
  for (const c of candidates) {
    if (!c.box) continue
    const d = Math.hypot(c.box.x + c.box.w / 2 - cx, c.box.y + c.box.h / 2 - cy)
    if (d < nearestDist) {
      nearest = c
      nearestDist = d
    }
  }
  const box = nearest?.box
  if (!box) return candidates
  return candidates.filter(c => c.box?.x === box.x && c.box.y === box.y && c.box.w === box.w && c.box.h === box.h)
}

/** Moves boxes from crop fractions to fractions of the whole photo; `rect` is the crop's place in the photo (fractions). */
export function toPhotoBoxes(candidates: PlateCandidate[], rect: Rect): PlateCandidate[] {
  return candidates.map(c =>
    c.box
      ? {
          ...c,
          box: {
            x: rect.x + c.box.x * rect.w,
            y: rect.y + c.box.y * rect.h,
            w: c.box.w * rect.w,
            h: c.box.h * rect.h
          }
        }
      : c
  )
}

function boxesOverlap(a: Rect, b: Rect): boolean {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  if (w <= 0 || h <= 0) return false
  return (w * h) / Math.min(a.w * a.h, b.w * b.h) >= DUPLICATE_OVERLAP
}

/** Per-crop reads (in photo coordinates, biggest plate first) as one list: a plate seen by two crops is kept once. */
export function mergeReads(perCrop: PlateCandidate[][]): PlateCandidate[] {
  const kept: PlateCandidate[] = []
  for (const reads of perCrop) {
    const first = reads[0]?.box
    if (first && kept.some(k => k.box && boxesOverlap(k.box, first))) continue
    for (const c of reads) if (!kept.some(k => k.plate === c.plate)) kept.push(c)
  }
  return kept
}

/** `Promise.allSettled` over `items` with at most `limit` running at once; results keep the input order. */
export async function settlePool<T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const i = next++
      try {
        results[i] = { status: 'fulfilled', value: await run(items[i]!) }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/** The bits of `navigator.connection` (Chromium only) the choice below looks at. */
export type ConnectionInfo = {
  type?: string
  effectiveType?: string
  downlink?: number
  saveData?: boolean
}

const FAST_DOWNLINK_MBPS = 10 // Chromium caps `downlink` at 10, so this means "10 or more"

/**
 * Whole-photo upload is fine on a fast link (wifi, ethernet, or a 4g/5g link measuring 10+ Mbps); anything slower, Data
 * Saver, or a browser without the Network Information API (Safari, Firefox) gets the small on-device crops instead.
 */
export function isFastConnection(c: ConnectionInfo | undefined): boolean {
  if (!c || c.saveData) return false
  if (c.type === 'wifi' || c.type === 'ethernet') return c.effectiveType === undefined || c.effectiveType === '4g'
  return c.effectiveType === '4g' && (c.downlink ?? 0) >= FAST_DOWNLINK_MBPS
}
