import { useEffect } from 'react'
import type { RefObject } from 'react'

type Options = {
  mouseEnabled: boolean
  mouseStrength: number
  scrollEnabled: boolean
  scrollStrength: number
}

// Same direct-DOM-write pattern as useCardMotion: writes --bg-parallax-x/y/scroll
// straight onto the node via pointermove/scroll, no setState, so mouse and scroll
// motion never re-renders the background layer.
export function useBackgroundParallax<T extends HTMLElement>(ref: RefObject<T | null>, options: Options): void {
  const { mouseEnabled, mouseStrength, scrollEnabled, scrollStrength } = options

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || !mouseEnabled) {
      node.style.setProperty('--bg-parallax-x', '0px')
      node.style.setProperty('--bg-parallax-y', '0px')
    }
    if (prefersReducedMotion || !scrollEnabled) {
      node.style.setProperty('--bg-parallax-scroll', '0px')
    }
    if (prefersReducedMotion) return

    function handlePointerMove(event: PointerEvent): void {
      if (!mouseEnabled) return
      const x = (event.clientX / window.innerWidth - 0.5) * mouseStrength
      const y = (event.clientY / window.innerHeight - 0.5) * mouseStrength
      node?.style.setProperty('--bg-parallax-x', `${x.toFixed(2)}px`)
      node?.style.setProperty('--bg-parallax-y', `${y.toFixed(2)}px`)
    }

    let frame = 0
    function handleScroll(): void {
      if (!scrollEnabled) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const offset = window.scrollY * (scrollStrength / 100)
        node?.style.setProperty('--bg-parallax-scroll', `${offset.toFixed(2)}px`)
      })
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return (): void => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(frame)
    }
  }, [ref, mouseEnabled, mouseStrength, scrollEnabled, scrollStrength])
}
