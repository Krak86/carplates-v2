import { useSyncExternalStore } from 'react'

/** Live `window.matchMedia(query).matches` (false during SSR / without matchMedia). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    notify => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', notify)
      return () => mql.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}
