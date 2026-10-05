import { useSyncExternalStore } from 'react'

/** Network Information API — Chromium only; absent elsewhere, where the connection is assumed fine. */
type NetworkInformation = EventTarget & { effectiveType?: string; saveData?: boolean }

const POOR_TYPES: readonly string[] = ['slow-2g', '2g', '3g']

function getConnection(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection
}

function subscribe(onChange: () => void): () => void {
  const connection = getConnection()
  connection?.addEventListener('change', onChange)
  return (): void => connection?.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  const connection = getConnection()
  return !!connection && (!!connection.saveData || POOR_TYPES.includes(connection.effectiveType ?? ''))
}

/** True on data-saver or a ≤3G link; re-evaluates whenever the browser reports a connection change. */
export function usePoorConnection(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
