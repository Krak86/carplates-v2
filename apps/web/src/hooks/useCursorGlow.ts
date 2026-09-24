import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

// Tracks the pointer across the whole page (not just while hovering the card)
// and writes its position relative to the node as --glow-x/--glow-y custom
// properties directly on the DOM node — no setState, so this never re-renders
// the component on pointer move.
export function useCursorGlow<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null)

  useEffect(() => {
    function handlePointerMove(event: PointerEvent): void {
      const node = ref.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 100
      const y = ((event.clientY - rect.top) / rect.height) * 100
      node.style.setProperty('--glow-x', `${x}%`)
      node.style.setProperty('--glow-y', `${y}%`)
    }

    window.addEventListener('pointermove', handlePointerMove)
    return (): void => window.removeEventListener('pointermove', handlePointerMove)
  }, [])

  return ref
}
