import { useSyncExternalStore } from 'react'
import { onlineManager } from '@tanstack/react-query'

/** Same source of truth TanStack Query uses to pause fetches, so UI and query state never disagree. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    onChange => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true
  )
}
