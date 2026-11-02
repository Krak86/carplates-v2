import {
  SHARE_BRUSH_MAX,
  SHARE_BRUSH_MIN,
  SHARE_RETOUCH_MAX_POINTS,
  SHARE_RETOUCH_MAX_STROKES
} from '@carplates/shared'
import type { RetouchStroke } from '@carplates/shared'

/** Brush radii as a fraction of the photo's longer side, small to large (all inside the server's limits). */
export const BRUSH_STEPS = [0.01, 0.02, 0.035, 0.05, 0.075, 0.1, 0.15] as const
export const DEFAULT_BRUSH_STEP = 3

if (BRUSH_STEPS.some(r => r < SHARE_BRUSH_MIN || r > SHARE_BRUSH_MAX))
  throw new Error('Brush step outside the server limits')

export type BlurMode = RetouchStroke['mode']

/** Points closer than this (0-1 fractions) to the previous one add nothing to the polyline. */
const MIN_STEP = 0.002
const MAX_STROKE_POINTS = 2000

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/** Whether the stroke list still has room for one more stroke under the server's caps. */
export function canAddStroke(strokes: RetouchStroke[]): boolean {
  return (
    strokes.length < SHARE_RETOUCH_MAX_STROKES &&
    strokes.reduce((n, s) => n + s.points.length, 0) < SHARE_RETOUCH_MAX_POINTS - MAX_STROKE_POINTS
  )
}

/** Appends a point unless it is too close to the last one or the stroke is full. */
export function extendStroke(points: [number, number][], x: number, y: number): [number, number][] {
  const last = points[points.length - 1]
  if (points.length >= MAX_STROKE_POINTS) return points
  if (last && Math.hypot(last[0] - x, last[1] - y) < MIN_STEP) return points
  return [...points, [x, y]]
}

/** Paints `strokes` (and the brush ring) on a canvas: translucent colours show where the server will add / erase blur. */
export function paintStrokes(
  canvas: HTMLCanvasElement,
  strokes: RetouchStroke[],
  ring: { x: number; y: number; radius: number } | null
): void {
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const width = Math.max(1, Math.round(rect.width * dpr))
  const height = Math.max(1, Math.round(rect.height * dpr))
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  const side = Math.max(width, height)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const { mode, radius, points } of strokes) {
    const first = points[0]
    if (!first) continue
    ctx.strokeStyle = mode === 'add' ? 'rgba(34, 211, 238, 0.45)' : 'rgba(251, 146, 60, 0.55)'
    ctx.fillStyle = ctx.strokeStyle
    ctx.lineWidth = radius * side * 2
    ctx.beginPath()
    ctx.moveTo(first[0] * width, first[1] * height)
    for (const [x, y] of points) ctx.lineTo(x * width, y * height)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(first[0] * width, first[1] * height, radius * side, 0, Math.PI * 2)
    ctx.fill()
  }
  if (ring) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.lineWidth = Math.max(1, dpr)
    ctx.beginPath()
    ctx.arc(ring.x * width, ring.y * height, ring.radius * side, 0, Math.PI * 2)
    ctx.stroke()
  }
}
