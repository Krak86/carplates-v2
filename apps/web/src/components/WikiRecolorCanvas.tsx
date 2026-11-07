import { useEffect, useRef, type ReactNode } from 'react'
import type { VehicleColor } from '@carplates/shared'

import { coverRect, paintLayer } from '@/components/wiki-recolor.helpers'

type Props = {
  mask: { w: number; h: number; data: Uint8ClampedArray }
  color: VehicleColor
  /** Tells the hero layer from a thumbnail one in tests. */
  testId?: string
}

const MAX_DPR = 2

// One painted layer canvas per mask and colour (a few ms to build, the user may flip the filter on and off).
const layerCache = new WeakMap<Uint8ClampedArray, Map<VehicleColor, HTMLCanvasElement>>()

function layerCanvas(mask: Props['mask'], color: VehicleColor): HTMLCanvasElement | null {
  const byColor = layerCache.get(mask.data) ?? new Map<VehicleColor, HTMLCanvasElement>()
  layerCache.set(mask.data, byColor)
  const cached = byColor.get(color)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = mask.w
  canvas.height = mask.h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.putImageData(new ImageData(paintLayer(mask.data, color), mask.w, mask.h), 0, 0)
  byColor.set(color, canvas)
  return canvas
}

/**
 * The colour filter layer: the repainted body (mask alpha) drawn in the same `object-fit: cover` box as the hero `<img>`
 * (the mask is the whole photo at the scan size, so it is cropped exactly like the photo), fading in above the photo.
 */
export default function WikiRecolorCanvas({ mask, color, testId = 'wiki-recolor-canvas' }: Props): ReactNode {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const draw = (): void => {
      const layer = layerCanvas(mask, color)
      const ctx = canvas.getContext('2d')
      const { clientWidth, clientHeight } = canvas
      if (!layer || !ctx || !clientWidth || !clientHeight) return
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      canvas.width = Math.round(clientWidth * dpr)
      canvas.height = Math.round(clientHeight * dpr)
      const { sx, sy, sw, sh } = coverRect(mask.w, mask.h, clientWidth, clientHeight)
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(layer, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
      canvas.dataset.ready = 'true'
    }
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [mask, color])

  return (
    <canvas
      ref={ref}
      aria-hidden
      data-testid={testId}
      className="pointer-events-none absolute inset-0 h-full w-full rounded-lg opacity-0 transition-opacity duration-300 data-[ready=true]:opacity-100"
    />
  )
}
