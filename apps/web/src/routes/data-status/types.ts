/** How often a source is expected to change, in the order the page lists them. `minutely`: polled by the server about every minute. `frozen`: upstream no longer updates. `live`: asked per request, nothing to sync. */
export const CADENCES = [
  'minutely',
  'live',
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'halfYearly',
  'yearly',
  'frozen'
] as const
export type Cadence = (typeof CADENCES)[number]

/** Days between expected syncs; `minutely` / `frozen` / `live` never go stale. */
export const CADENCE_DAYS: Record<Exclude<Cadence, 'minutely' | 'frozen' | 'live'>, number> = {
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
  /** The newest record date is a month, not a day (the source publishes whole months): shown as "November 2026". */
  latestByMonth?: boolean
  /** i18n key of an extra line about how this source is synced (shown under its name). */
  noteKey?: string
  /** i18n key of a warning line (with `{{count}}`) shown while `gaps[id]` from the API is above 0. */
  gapKey?: string
  /** Rows of a source held as a static file, not in the database (so the API cannot count it): shown as its record count. */
  staticCount?: number
}
