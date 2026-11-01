/** How often a source is expected to change, in the order the page lists them. `frozen`: upstream no longer updates. `live`: asked per request, nothing to sync. */
export const CADENCES = ['daily', 'weekly', 'monthly', 'quarterly', 'halfYearly', 'yearly', 'frozen', 'live'] as const
export type Cadence = (typeof CADENCES)[number]

/** Days between expected syncs; `frozen` / `live` never go stale. */
export const CADENCE_DAYS: Record<Exclude<Cadence, 'frozen' | 'live'>, number> = {
  daily: 1,
  weekly: 7,
  monthly: 31,
  quarterly: 92,
  halfYearly: 183,
  yearly: 366
}

export const STATUSES = ['fresh', 'due', 'stale', 'failing', 'frozen', 'live', 'unknown'] as const
export type Status = (typeof STATUSES)[number]

export type Dataset = {
  id: string
  /** The source's own name; not translated. */
  name: string
  /** The page that shows it. */
  to?: string
  cadence: Cadence
  /** The scheduled job (`scripts/src/jobs.ts`) that refreshes it: its last `ok` run is the last sync, and a failed newest run flags it. */
  job?: string
  /** Days between syncs when that differs from the cadence: the plates job polls twice a week for a source that publishes monthly. */
  checkEveryDays?: number
  /** ISO date of the last manual refresh (the seed CSV's last export). For a job it is the day the schedule went live and only covers the time before its first recorded run. */
  refreshedOn?: string
}
