import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const MAX_TILT_DEG = 1
const PERSPECTIVE_RATIO = 1.6

// Tracks the pointer across the whole page (not just while hovering the card) and
// writes its position relative to the node as --glow-x/--glow-y custom properties,
// plus a 3D tilt (--tilt-x/--tilt-y) that's only non-zero while the pointer is
// actually over the node — outside it the tilt vars reset to 0deg so the card
// eases back to flat via its own CSS transition. All writes go directly on the
// DOM node, no setState, so this never re-renders the component on pointer move.
//
// --tilt-perspective scales with the node's own height (PERSPECTIVE_RATIO) rather
// than being a fixed px value: rotateX/Y's visual swing is proportional to how far
// a point sits from the rotation origin (the box center), so a fixed perspective
// makes the same MAX_TILT_DEG look dramatically more exaggerated once the card
// grows tall (e.g. history/ratings/photos sections expanded) than when it's short.
// Scaling perspective with height keeps the apparent tilt looking the same size
// at any card height.
//
// tiltEnabled is a user-facing on/off (the card's own tilt toggle) — when false,
// the tilt vars are immediately zeroed (the card's transition eases it flat) and
// pointermove stops recomputing them, while the glow keeps tracking as before.
export function useCardMotion<T extends HTMLElement>(tiltEnabled: boolean): RefObject<T | null> {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!tiltEnabled) {
      ref.current?.style.setProperty('--tilt-x', '0deg')
      ref.current?.style.setProperty('--tilt-y', '0deg')
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function handlePointerMove(event: PointerEvent): void {
      const node = ref.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 100
      const y = ((event.clientY - rect.top) / rect.height) * 100
      node.style.setProperty('--glow-x', `${x}%`)
      node.style.setProperty('--glow-y', `${y}%`)

      if (prefersReducedMotion || !tiltEnabled) return
      node.style.setProperty('--tilt-perspective', `${rect.height * PERSPECTIVE_RATIO}px`)
      const withinBounds = x >= 0 && x <= 100 && y >= 0 && y <= 100
      const tiltX = withinBounds ? (((50 - y) / 50) * MAX_TILT_DEG).toFixed(2) : '0'
      const tiltY = withinBounds ? (((x - 50) / 50) * MAX_TILT_DEG).toFixed(2) : '0'
      node.style.setProperty('--tilt-x', `${tiltX}deg`)
      node.style.setProperty('--tilt-y', `${tiltY}deg`)
    }

    window.addEventListener('pointermove', handlePointerMove)
    return (): void => window.removeEventListener('pointermove', handlePointerMove)
  }, [tiltEnabled])

  return ref
}
