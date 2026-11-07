import { useSyncExternalStore } from 'react'

/**
 * How many route chunks are being waited for right now (the route `Suspense` fallback is mounted). The header progress
 * bar reads it next to TanStack Query's fetch count, so it keeps going until the new page has its code in.
 */
let pending = 0
const listeners = new Set<() => void>()

const emit = (): void => {
  for (const listener of listeners) listener()
}

/** Marks one pending route chunk; returns the function that clears it (use as an effect body). */
export function beginRoutePending(): () => void {
  pending += 1
  emit()
  return () => {
    pending -= 1
    emit()
  }
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useRoutePending = (): boolean => useSyncExternalStore(subscribe, () => pending > 0)
