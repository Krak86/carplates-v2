import { useEffect, useRef, useState } from 'react'
import type { PointerEvent, RefObject } from 'react'

const SWIPE_MIN_PX = 40
const DRAG_START_PX = 8
const FLY_OFF_PX = 160
const FLY_OFF_MS = 120

type Dir = 1 | -1 | 0

type Result<E extends HTMLElement, C extends HTMLElement> = {
  /** Attach to the element that moves with the finger; give it a `key` that changes with the photo so the entry animation replays. */
  slideRef: RefObject<E | null>
  /** Entry-animation class for the photo that just arrived ('' on first render). */
  slideClass: string
  /** Spread on the swipe container (use `touch-pan-y` on it). */
  bind: {
    onPointerDown: (e: PointerEvent<C>) => void
    onPointerMove: (e: PointerEvent<C>) => void
    onPointerUp: (e: PointerEvent<C>) => void
    onPointerCancel: () => void
  }
  /** Step through the photos with the slide-in direction (arrows, thumbnails). */
  step: (d: 1 | -1) => void
  /** True right after a swipe: the click that ends it must not open / follow anything. */
  wasSwipe: () => boolean
}

/**
 * Swipe carousel feel: the photo follows the finger (GPU transform written straight to the DOM, no re-render per move),
 * flies off on a committed swipe or springs back; the next photo glides in from that side (`animate-photo-from-*`).
 */
export function useSwipeSlide<E extends HTMLElement = HTMLElement, C extends HTMLElement = HTMLElement>(
  enabled: boolean,
  onStep: (d: 1 | -1) => void
): Result<E, C> {
  const [dir, setDir] = useState<Dir>(0)
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const slideRef = useRef<E>(null)
  const flyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => (): void => clearTimeout(flyTimer.current), [])

  const step = (d: 1 | -1): void => {
    setDir(d)
    onStep(d)
  }

  const drag = (dx: number, animate: boolean): void => {
    const el = slideRef.current
    if (!el) return
    el.style.transition = animate ? 'transform 180ms ease-out, opacity 180ms ease-out' : 'none'
    el.style.transform = `translate3d(${dx}px, 0, 0) rotate(${dx / 40}deg)`
    el.style.opacity = String(Math.max(0.2, 1 - Math.abs(dx) / 400))
  }

  return {
    slideRef,
    slideClass: dir > 0 ? 'animate-photo-from-right' : dir < 0 ? 'animate-photo-from-left' : '',
    bind: {
      onPointerDown: (e): void => {
        start.current = { x: e.clientX, y: e.clientY, moved: false }
      },
      onPointerMove: (e): void => {
        const s = start.current
        if (!s || !enabled) return
        const dx = e.clientX - s.x
        if (Math.abs(dx) > Math.abs(e.clientY - s.y) && Math.abs(dx) > DRAG_START_PX) drag(dx, false)
      },
      onPointerUp: (e): void => {
        const s = start.current
        if (!s || !enabled) return
        const dx = e.clientX - s.x
        if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
          s.moved = true
          const d = dx < 0 ? 1 : -1
          drag(d * FLY_OFF_PX, true)
          flyTimer.current = setTimeout(() => step(d), FLY_OFF_MS)
        } else drag(0, true)
      },
      onPointerCancel: () => drag(0, true)
    },
    step,
    wasSwipe: () => !!start.current?.moved
  }
}
