import { useEffect, useState } from 'react'

const IDLE_TIMEOUT_MS = 1500

/** True once the browser is idle after first paint (or after a short timeout) — gates non-critical UI chunks. */
export function useIdleReady(): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (ready) return
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: IDLE_TIMEOUT_MS })
      return (): void => window.cancelIdleCallback(id)
    }
    const t = setTimeout(() => setReady(true), 200)
    return (): void => clearTimeout(t)
  }, [ready])

  return ready
}
