import { useEffect, useRef } from 'react'

import type { CameraZoom } from '@/components/use-camera-zoom'

function touchDistance(touches: TouchList): number {
  const a = touches.item(0)
  const b = touches.item(1)
  if (!a || !b) return 0
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

// Two-finger pinch on `target` drives the camera's hardware zoom. No-op when the camera has no zoom range.
// The target needs `touch-action: none` (Tailwind `touch-none`) so the browser doesn't pinch-zoom the page.
export function usePinchZoom(target: React.RefObject<HTMLElement | null>, camera: CameraZoom): void {
  const cameraRef = useRef(camera)

  useEffect(() => {
    cameraRef.current = camera
  })

  useEffect(() => {
    const el = target.current
    if (!el) return

    let startDistance = 0
    let startZoom = 1

    const handleTouchStart = (e: TouchEvent): void => {
      if (e.touches.length !== 2) return
      startDistance = touchDistance(e.touches)
      startZoom = cameraRef.current.zoom
    }

    const handleTouchMove = (e: TouchEvent): void => {
      const { range, setZoom } = cameraRef.current
      if (e.touches.length !== 2 || !range || startDistance === 0) return
      e.preventDefault()
      const next = startZoom * (touchDistance(e.touches) / startDistance)
      setZoom(Math.min(range.max, Math.max(range.min, next)))
    }

    const handleTouchEnd = (): void => {
      startDistance = 0
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)
    el.addEventListener('touchcancel', handleTouchEnd)
    return (): void => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [target])
}
