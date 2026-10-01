import { useRef, useState } from 'react'
import type { PlateCandidate } from '@carplates/shared'

import { recognizePlate } from '@/lib/api'
import type { PlateBox } from '@/lib/plate-detector-types'

import type { BoxLabel, DetectionHandlers } from './use-live-plate-detection'

const STABLE_FRAMES = 4 // consecutive frames a box must hold still before we spend a request on it
const STILL_IOU = 0.6 // overlap with the previous frame that counts as "holding still"
const MATCH_IOU = 0.3 // overlap that still counts as the same plate (a moving camera drags boxes along)
const MAX_MISSED = 6 // frames a track may go unseen before it is dropped
const RETRY_GAP_MS = 800
const MAX_PLATES = 20
const CROP_PAD = 0.35 // context around the box, as a fraction of its size — the server detector wants some margin
const MIN_CROP_WIDTH = 160

type Track = { box: PlateBox; still: number; missed: number; plate: string | null }

function iou(a: PlateBox, b: PlateBox): number {
  const w = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)
  const h = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1)
  if (w <= 0 || h <= 0) return 0
  const inter = w * h
  return inter / (area(a) + area(b) - inter)
}

function area(b: PlateBox): number {
  return (b.x2 - b.x1) * (b.y2 - b.y1)
}

type Crop = {
  file: File
  /** Where the tracked plate's centre sits in the crop, as fractions of its size. */ cx: number
  cy: number
}

function cropToFile(video: HTMLVideoElement, box: PlateBox): Promise<Crop | null> {
  const bw = box.x2 - box.x1
  const bh = box.y2 - box.y1
  const x = Math.max(0, box.x1 - bw * CROP_PAD)
  const y = Math.max(0, box.y1 - bh * CROP_PAD)
  const w = Math.min(video.videoWidth - x, bw * (1 + 2 * CROP_PAD))
  const h = Math.min(video.videoHeight - y, bh * (1 + 2 * CROP_PAD))
  const scale = Math.max(1, MIN_CROP_WIDTH / w)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d')?.drawImage(video, x, y, w, h, 0, 0, canvas.width, canvas.height)
  const cx = (box.x1 + bw / 2 - x) / w
  const cy = (box.y1 + bh / 2 - y) / h
  return new Promise(resolve =>
    canvas.toBlob(
      blob => resolve(blob ? { file: new File([blob], 'ar.jpg', { type: 'image/jpeg' }), cx, cy } : null),
      'image/jpeg',
      0.92
    )
  )
}

type ArPlateReader = {
  /** Plates read so far, in the order they were found. */
  plates: string[]
  /** The plate whose info is shown: the one picked by the user, else the first found. */
  active: string | null
  select: (plate: string) => void
  /** True while a crop is being read. */
  reading: boolean
  /** Detector hooks: feed every frame in, and label the drawn boxes. */
  handlers: DetectionHandlers
  /** Empties the list so everything in view is read afresh. */
  clear: () => void
}

/** Of the plates found in a crop, the one nearest the tracked box — a neighbouring car's plate may be in the crop too. */
function pickNearest(candidates: PlateCandidate[], cx: number, cy: number): string | undefined {
  let best: PlateCandidate | undefined
  let bestDist = Infinity
  for (const c of candidates) {
    if (!c.box) continue
    const d = Math.hypot(c.box.x + c.box.w / 2 - cx, c.box.y + c.box.h / 2 - cy)
    if (d < bestDist) {
      best = c
      bestDist = d
    }
  }
  return (best ?? candidates[0])?.plate
}

/**
 * Turns detector boxes into a list of plate reads. Every visible plate is tracked frame to frame; one that holds
 * still is cropped and OCR'd server-side (one request at a time, largest first), and each plate is read once.
 */
export function useArPlateReader(): ArPlateReader {
  const [plates, setPlates] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const tracks = useRef<Track[]>([])
  const busy = useRef(false)
  const blockedUntil = useRef(0)
  const generation = useRef(0) // bumped by clear(), so a read still in flight can't repopulate the list
  const activeRef = useRef<string | null>(null)

  const active = selected && plates.includes(selected) ? selected : (plates[0] ?? null)
  activeRef.current = active

  const read = (video: HTMLVideoElement, track: Track): void => {
    busy.current = true
    setReading(true)
    const gen = generation.current
    void cropToFile(video, track.box)
      .then(async crop => {
        if (!crop) return
        const res = await recognizePlate(crop.file)
        const top = pickNearest(res.candidates, crop.cx, crop.cy)
        if (!top || gen !== generation.current) return
        track.plate = top
        setPlates(prev => (prev.includes(top) ? prev : [...prev, top].slice(-MAX_PLATES)))
      })
      .catch(() => undefined)
      .finally(() => {
        track.still = 0
        blockedUntil.current = performance.now() + RETRY_GAP_MS
        busy.current = false
        setReading(false)
      })
  }

  const onFrame = (boxes: PlateBox[], video: HTMLVideoElement): void => {
    const unmatched = new Set(tracks.current)
    const next: Track[] = []
    for (const box of [...boxes].sort((a, b) => area(b) - area(a))) {
      let best: Track | null = null
      let bestIou = MATCH_IOU
      for (const t of unmatched) {
        const o = iou(t.box, box)
        if (o >= bestIou) {
          best = t
          bestIou = o
        }
      }
      if (best) {
        unmatched.delete(best)
        best.still = bestIou >= STILL_IOU ? best.still + 1 : 0
        best.box = box
        best.missed = 0
        next.push(best)
      } else next.push({ box, still: 0, missed: 0, plate: null })
    }
    for (const t of unmatched) {
      t.missed++
      if (t.missed <= MAX_MISSED) next.push(t)
    }
    tracks.current = next

    if (busy.current || performance.now() < blockedUntil.current) return
    const ready = next.find(t => !t.plate && t.missed === 0 && t.still >= STABLE_FRAMES)
    if (ready) read(video, ready)
  }

  const labelFor = (box: PlateBox): BoxLabel | null => {
    const plate = tracks.current.find(t => t.box === box)?.plate
    return plate ? { text: plate, active: plate === activeRef.current } : null
  }

  const clear = (): void => {
    generation.current++
    tracks.current = []
    setPlates([])
    setSelected(null)
  }

  return { plates, active, select: setSelected, reading, handlers: { onFrame, labelFor }, clear }
}
