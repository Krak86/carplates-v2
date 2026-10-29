import type { DetectorRequest, DetectorResponse, PlateBox } from './plate-detector-types'
import {
  CROP_PAD,
  MAX_CROPS,
  cropRect,
  dedupeBoxes,
  isFastConnection,
  planTiles,
  type ConnectionInfo,
  type Rect
} from './photo-crops-helpers'

// The on-device detector (the one the AR scan runs) finds the plates in a picked photo, so only small crops go over
// the network instead of the whole frame - the upload is what dominates on 4G. Every failure resolves to null and the
// caller uploads the full image as before.

const DETECT_MAX_SIDE = 1280 // the detector letterboxes to 384 px; a bigger copy only costs resize time
const READY_TIMEOUT_MS = 4000 // a model still downloading on a slow link must not hold the photo back
const IDLE_TERMINATE_MS = 60_000
const MIN_CROP_WIDTH = 160
const MAX_CROP_SIDE = 1280
const CROP_QUALITY = 0.9

export type PlateCrop = {
  file: File
  /** Where the detected plate's centre sits in the crop, as fractions of its size. */
  cx: number
  cy: number
  /** Where the crop sits in the photo, as fractions of its size (orientation applied). */
  rect: Rect
}

type Detector = { detect: (frame: ImageBitmap) => Promise<PlateBox[]> }

let detectorPromise: Promise<Detector> | null = null

function startDetector(): Promise<Detector> {
  const worker = new Worker(new URL('./plate-detector.worker.ts', import.meta.url), { type: 'module' })
  return new Promise<Detector>((resolve, reject) => {
    const pending = new Map<number, { resolve: (b: PlateBox[]) => void; reject: (e: Error) => void }>()
    let ready = false
    let nextId = 0
    let queue: Promise<unknown> = Promise.resolve()
    let idleTimer: ReturnType<typeof setTimeout> | undefined

    const stop = (error: Error): void => {
      clearTimeout(idleTimer)
      worker.terminate()
      detectorPromise = null
      for (const p of pending.values()) p.reject(error)
      pending.clear()
      if (!ready) reject(error)
    }

    // The worker shares one input buffer, so frames go through it one at a time.
    const send = (frame: ImageBitmap): Promise<PlateBox[]> =>
      new Promise((res, rej) => {
        const id = nextId++
        pending.set(id, { resolve: res, reject: rej })
        const request: DetectorRequest = { id, frame }
        worker.postMessage(request, [frame])
      })

    worker.onmessage = ({ data }: MessageEvent<DetectorResponse>): void => {
      if (data.type === 'ready') {
        ready = true
        resolve({
          detect: frame => {
            clearTimeout(idleTimer)
            const run = queue.then(() => send(frame))
            queue = run.catch(() => undefined)
            return run.finally(() => {
              idleTimer = setTimeout(() => stop(new Error('detector idle')), IDLE_TERMINATE_MS)
            })
          }
        })
      } else if (data.type === 'error') {
        stop(new Error(data.message))
      } else {
        pending.get(data.id)?.resolve(data.boxes)
        pending.delete(data.id)
      }
    }
    worker.onerror = (): void => stop(new Error('detector worker failed'))
  })
}

/** True when the link is slow (or unknown) enough that uploading small on-device crops beats uploading the photo. */
export function shouldUploadCrops(): boolean {
  return !isFastConnection((navigator as Navigator & { connection?: ConnectionInfo }).connection)
}

/** Starts loading the detector model (7 MB) so it is ready by the time a photo is picked. Safe to call repeatedly; skipped on a fast link, where it is not used. */
export function preloadPlateDetector(): void {
  if (!shouldUploadCrops()) return
  if (typeof Worker === 'undefined' || typeof createImageBitmap === 'undefined') return
  detectorPromise ??= startDetector()
  detectorPromise.catch(() => undefined)
}

function readyDetector(): Promise<Detector | null> {
  if (typeof Worker === 'undefined') return Promise.resolve(null)
  detectorPromise ??= startDetector()
  const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), READY_TIMEOUT_MS))
  return Promise.race([detectorPromise, timeout]).catch(() => null)
}

function cropToFile(bitmap: ImageBitmap, box: PlateBox): Promise<PlateCrop | null> {
  const r = cropRect(box, bitmap.width, bitmap.height, CROP_PAD)
  const scale = Math.min(Math.max(1, MIN_CROP_WIDTH / r.w), MAX_CROP_SIDE / Math.max(r.w, r.h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(r.w * scale))
  canvas.height = Math.max(1, Math.round(r.h * scale))
  canvas.getContext('2d')?.drawImage(bitmap, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height)
  const cx = ((box.x1 + box.x2) / 2 - r.x) / r.w
  const cy = ((box.y1 + box.y2) / 2 - r.y) / r.h
  const rect = { x: r.x / bitmap.width, y: r.y / bitmap.height, w: r.w / bitmap.width, h: r.h / bitmap.height }
  return new Promise(resolve =>
    canvas.toBlob(
      blob => resolve(blob ? { file: new File([blob], 'plate.jpg', { type: 'image/jpeg' }), cx, cy, rect } : null),
      'image/jpeg',
      CROP_QUALITY
    )
  )
}

/**
 * Plate crops of a photo (biggest plate first, at most MAX_CROPS), found on the device. Big photos are also scanned in
 * overlapping tiles so a small plate is not lost to the detector's 384 px input. null = could not tell (no worker,
 * model not ready in time, undecodable file) or found nothing: upload the whole photo instead.
 */
export async function detectPlateCrops(file: File): Promise<PlateCrop[] | null> {
  const detector = await readyDetector()
  if (!detector) return null

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }

  try {
    const boxes: PlateBox[] = []
    for (const tile of planTiles(bitmap.width, bitmap.height)) {
      const scale = Math.min(1, DETECT_MAX_SIDE / Math.max(tile.w, tile.h))
      const frame = await createImageBitmap(bitmap, tile.x, tile.y, tile.w, tile.h, {
        resizeWidth: Math.max(1, Math.round(tile.w * scale)),
        resizeHeight: Math.max(1, Math.round(tile.h * scale)),
        resizeQuality: 'medium'
      })
      for (const b of await detector.detect(frame)) {
        boxes.push({
          ...b,
          x1: tile.x + b.x1 / scale,
          y1: tile.y + b.y1 / scale,
          x2: tile.x + b.x2 / scale,
          y2: tile.y + b.y2 / scale
        })
      }
    }

    const crops: PlateCrop[] = []
    for (const box of dedupeBoxes(boxes).slice(0, MAX_CROPS)) {
      const crop = await cropToFile(bitmap, box)
      if (crop) crops.push(crop)
    }
    return crops.length > 0 ? crops : null
  } catch {
    return null
  } finally {
    bitmap.close()
  }
}
