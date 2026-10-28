import type { ReleaseDay, ReleaseItem } from '@carplates/shared/releases'

/** The digest is cut by Kyiv calendar days, the same clock the release log is written on. */
const DIGEST_TIME_ZONE = 'Europe/Kyiv'
/** First hour (Kyiv) on the 1st when the digest may go out. */
export const DIGEST_SEND_HOUR = 9
/** The send window stays open this many days into the month, so an API that was down on the 1st still catches up. */
export const DIGEST_WINDOW_DAYS = 3

export type DigestPeriod = {
  /** `YYYY-MM` of the month the digest covers. */
  period: string
  /** First and last release date (inclusive, `YYYY-MM-DD`). */
  from: string
  to: string
}

export type Digest = {
  period: DigestPeriod
  /** `new` items of the month, newest day first. */
  features: ReleaseItem[]
  /** Counts of the items that are only summarised ("+ N improvements"). */
  improved: number
  data: number
  fix: number
}

const pad = (n: number): string => String(n).padStart(2, '0')

function kyivParts(now: Date): { year: number; month: number; day: number; hour: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DIGEST_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23'
  }).formatToParts(now)
  const get = (type: string): number => Number(parts.find(p => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') }
}

/** The month before the one `now` falls in (Kyiv time), e.g. on 2026-11-01 -> October 2026. */
export function previousPeriod(now: Date): DigestPeriod {
  const { year, month } = kyivParts(now)
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate()
  const prefix = `${String(prevYear)}-${pad(prevMonth)}`
  return { period: prefix, from: `${prefix}-01`, to: `${prefix}-${pad(lastDay)}` }
}

/** Whether `now` is inside the window in which last month's digest should be (re)attempted. */
export function isSendWindow(now: Date): boolean {
  const { day, hour } = kyivParts(now)
  return day <= DIGEST_WINDOW_DAYS && (day > 1 || hour >= DIGEST_SEND_HOUR)
}

/**
 * Collects the period's release log into a digest: every `new` item in full, the rest as counts. `null` when the month
 * shipped no new feature - the job then sends nothing.
 */
export function buildDigest(releases: readonly ReleaseDay[], period: DigestPeriod): Digest | null {
  const days = releases
    .filter(d => d.date >= period.from && d.date <= period.to)
    .sort((a, b) => b.date.localeCompare(a.date))
  const items = days.flatMap(d => d.items)
  const features = items.filter(i => i.group === 'new')
  if (!features.length) return null
  const count = (group: ReleaseItem['group']): number => items.filter(i => i.group === group).length
  return { period, features, improved: count('improved'), data: count('data'), fix: count('fix') }
}
