/** A snapshot older than this is not shown: fail closed, never "no alert" from stale data. */
export const ALARM_MAX_AGE_MS = 3 * 60_000

export const isFresh = (fetchedAt: number | null, now: number, maxAgeMs = ALARM_MAX_AGE_MS): boolean =>
  fetchedAt !== null && now - fetchedAt <= maxAgeMs
