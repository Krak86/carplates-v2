import { MaintenanceError } from '@/lib/api'

/** Keep retrying a maintenance answer for about two minutes (a deploy gap is seconds; a planned window can be longer). */
const MAINTENANCE_RETRIES = 24
const MAINTENANCE_RETRY_CAP_SECONDS = 5

const listeners = new Set<() => void>()
let active = false

export const isMaintenance = (): boolean => active

export function subscribeMaintenance(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function setMaintenance(next: boolean): void {
  if (active === next) return
  active = next
  for (const notify of listeners) notify()
}

/** Query `retry`: a maintenance answer is retried patiently, anything else keeps the default single retry. */
export const retryQuery = (failureCount: number, error: Error): boolean =>
  error instanceof MaintenanceError ? failureCount < MAINTENANCE_RETRIES : failureCount < 1

/** Query `retryDelay`: poll a maintenance answer quickly (the proxy's Retry-After is a ceiling, not a target). */
export const retryDelayQuery = (failureCount: number, error: Error): number =>
  error instanceof MaintenanceError
    ? Math.min(error.retryAfterSeconds ?? MAINTENANCE_RETRY_CAP_SECONDS, MAINTENANCE_RETRY_CAP_SECONDS) * 1000
    : Math.min(1000 * 2 ** failureCount, 30_000)
