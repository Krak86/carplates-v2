import { useEffect } from 'react'

/** Closes a modal on Escape. `enabled` is false while another modal sits above this one, so only the top one closes. */
export function useEscape(onClose: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, enabled])
}
