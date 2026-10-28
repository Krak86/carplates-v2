import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { THEMES, type SceneryId } from '@/lib/racer/config'
import { drawMap, type MapView } from '@/lib/racer/minimap'

type Props = {
  getMap: () => MapView | null
  scenery: SceneryId
  /** `#rrggbb` body colour of the player's car. */
  color: string
  /** Backing-store pixels per side. */
  size: number
  label: string
  className?: string
}

/** Rotating top-down radar of the generated road, redrawn every frame from the engine's read-only `MapView`. */
export default function RaceMiniMap({ getMap, scenery, color, size, label, className }: Props): ReactNode {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const style = { road: THEMES[scenery].light, leaf: THEMES[scenery].leaf, player: color }
    let raf = 0
    const tick = (): void => {
      const view = getMap()
      if (view) drawMap(ctx, size, view.track, view.state(), style)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [getMap, scenery, color, size])

  return <canvas ref={canvasRef} width={size} height={size} role="img" aria-label={label} className={className} />
}
