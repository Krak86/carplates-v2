import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

import type { DetectorRequest, DetectorResponse, PlateBox } from '@/lib/plate-detector-types'

export type BoxLabel = { text: string | null; active: boolean }

export type DetectionHandlers = {
  /** Called with every frame's boxes, before they are drawn. */
  onFrame: (boxes: PlateBox[], video: HTMLVideoElement) => void
  /** Text/colour for a box; null draws it as a plain, not-yet-read box. */
  labelFor: (box: PlateBox) => BoxLabel | null
}

export type DetectionStatus = 'loading' | 'ready' | 'error'

const COLOR_ACTIVE = '#4ade80'
const COLOR_READ = '#fbbf24'
const COLOR_PENDING = '#ffffff'
// The stream may be 4K (sharp crops for reading); the detector only needs a downscaled copy of each frame.
const DETECT_MAX_WIDTH = 1280
const MIN_FRAME_GAP_MS = 80 // ≈12 fps ceiling; the worker's own speed is the real limit

function draw(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  boxes: PlateBox[],
  labelFor?: DetectionHandlers['labelFor']
): void {
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
  }
  const g = canvas.getContext('2d')
  if (!g) return
  g.clearRect(0, 0, canvas.width, canvas.height)
  g.lineWidth = Math.max(2, canvas.width / 240)
  const fontPx = Math.max(14, Math.round(canvas.width / 40))
  g.font = `600 ${fontPx}px ui-monospace, monospace`
  g.textBaseline = 'middle'
  for (const b of boxes) {
    const label = labelFor?.(b)
    const color = label ? (label.active ? COLOR_ACTIVE : COLOR_READ) : COLOR_PENDING
    g.strokeStyle = color
    g.strokeRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1)
    if (!label?.text) continue
    const w = g.measureText(label.text).width + fontPx * 0.6
    const h = fontPx * 1.4
    const y = b.y1 - h < 0 ? b.y2 : b.y1 - h
    g.fillStyle = color
    g.fillRect(b.x1, y, w, h)
    g.fillStyle = '#000'
    g.fillText(label.text, b.x1 + fontPx * 0.3, y + h / 2)
  }
}

/**
 * Runs the in-browser plate detector (a Web Worker, so React's render loop never stalls) on the live video and
 * draws tracking boxes on `canvasRef`. Detection only — reading the plate is a later step.
 */
export function useLivePlateDetection(
  active: boolean,
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  handlers?: DetectionHandlers
): DetectionStatus {
  const [status, setStatus] = useState<DetectionStatus>('loading')
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    if (!active) return

    const canvas = canvasRef.current
    const worker = new Worker(new URL('../lib/plate-detector.worker.ts', import.meta.url), { type: 'module' })
    let stopped = false
    let busy = false
    let ready = false
    let nextId = 0
    let lastSent = 0
    let frameScale = 1 // detector-frame width / video width for the frame in flight
    let timer: ReturnType<typeof setTimeout> | undefined

    const schedule = (): void => {
      if (!stopped) timer = setTimeout(tick, MIN_FRAME_GAP_MS)
    }

    const tick = (): void => {
      const video = videoRef.current
      if (!ready || busy || !video || video.readyState < 2 || !video.videoWidth) {
        schedule()
        return
      }
      busy = true
      lastSent = performance.now()
      frameScale = Math.min(1, DETECT_MAX_WIDTH / video.videoWidth)
      const resize =
        frameScale < 1
          ? {
              resizeWidth: Math.round(video.videoWidth * frameScale),
              resizeHeight: Math.round(video.videoHeight * frameScale),
              resizeQuality: 'low' as const
            }
          : undefined
      createImageBitmap(video, resize).then(
        frame => {
          const request: DetectorRequest = { id: nextId++, frame }
          worker.postMessage(request, [frame])
        },
        () => {
          busy = false
          schedule()
        }
      )
    }

    worker.onmessage = ({ data }: MessageEvent<DetectorResponse>): void => {
      if (data.type === 'ready') {
        ready = true
        setStatus('ready')
        schedule()
      } else if (data.type === 'error') {
        busy = false
        if (!ready) {
          stopped = true
          setStatus('error')
        } else schedule()
      } else {
        busy = false
        const video = videoRef.current
        if (canvas && video && video.videoWidth) {
          // Boxes come back in detector-frame pixels; the canvas and crops work in full video pixels.
          const boxes =
            frameScale < 1
              ? data.boxes.map(b => ({
                  ...b,
                  x1: b.x1 / frameScale,
                  y1: b.y1 / frameScale,
                  x2: b.x2 / frameScale,
                  y2: b.y2 / frameScale
                }))
              : data.boxes
          handlersRef.current?.onFrame(boxes, video)
          draw(canvas, video, boxes, handlersRef.current?.labelFor)
        }
        timer = setTimeout(tick, Math.max(0, MIN_FRAME_GAP_MS - (performance.now() - lastSent)))
      }
    }
    worker.onerror = (): void => {
      stopped = true
      setStatus('error')
    }

    return (): void => {
      stopped = true
      clearTimeout(timer)
      worker.terminate()
      canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [active, videoRef, canvasRef])

  return status
}
