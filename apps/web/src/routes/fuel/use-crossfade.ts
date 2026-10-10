import { useEffect, useState } from 'react'

const FADE_OUT_MS = 150

/**
 * Holds the previously shown value for `FADE_OUT_MS` after `target` changes: `leaving` is true meanwhile (fade the old
 * content out), then `shown` switches to the new value (mount and animate it in).
 */
export function useCrossfade<T>(target: T): { shown: T; leaving: boolean } {
  const [shown, setShown] = useState(target)
  const leaving = shown !== target

  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(() => setShown(target), FADE_OUT_MS)
    return (): void => clearTimeout(timer)
  }, [leaving, target])

  return { shown, leaving }
}
