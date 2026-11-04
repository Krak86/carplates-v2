import type { ActiveAlarmArea, AlarmStatsEvent, AlarmStatsResponse } from '@carplates/shared'

const KYIV = 'Europe/Kyiv'
const DAY_MS = 24 * 60 * 60_000

/** What the recorder must do after a poll: open alerts for new areas, close the ones that left the feed. */
export const diffAreas = (
  openAreaIds: ReadonlySet<string>,
  active: readonly ActiveAlarmArea[]
): { toOpen: ActiveAlarmArea[]; toClose: string[] } => {
  const activeIds = new Set(active.map(a => a.areaId))
  return {
    toOpen: active.filter(a => !openAreaIds.has(a.areaId)),
    toClose: [...openAreaIds].filter(id => !activeIds.has(id))
  }
}

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: KYIV,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})
const hourFormat = new Intl.DateTimeFormat('en-GB', { timeZone: KYIV, hour: '2-digit', hourCycle: 'h23' })

/** Kyiv calendar day (`YYYY-MM-DD`) of an instant. */
export const kyivDay = (date: Date): string => dayFormat.format(date)

/** Kyiv hour 0-23 of an instant. */
export const kyivHour = (date: Date): number => Number(hourFormat.format(date)) % 24

/** The calendar day before a `YYYY-MM-DD` key. */
export const previousDay = (day: string): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10)

export type EventRow = { areaName: string; region: string; startedAt: Date; endedAt: Date | null }

const toEvent = (row: EventRow, now: Date): AlarmStatsEvent => ({
  name: row.areaName,
  region: row.region,
  startedAt: row.startedAt.toISOString(),
  seconds: Math.max(0, Math.round(((row.endedAt ?? now).getTime() - row.startedAt.getTime()) / 1000)),
  ongoing: row.endedAt === null
})

/**
 * Today's numbers (Kyiv day) from recorded events. An alert counts on its start day, so alerts that began before today
 * (permanent ones in Crimea / Luhansk) are not in `total`. `recordingSince` = first recorded start; the previous-day
 * total is only given when the recorder covered that whole day.
 */
export const buildStats = (rows: readonly EventRow[], recordingSince: Date | null, now: Date): AlarmStatsResponse => {
  const day = kyivDay(now)
  const prev = previousDay(day)
  const today = rows.filter(r => kyivDay(r.startedAt) === day)
  const prevCount = rows.filter(r => kyivDay(r.startedAt) === prev).length

  const byHour = Array.from({ length: 24 }, () => 0)
  const byRegion = new Map<string, number>()
  for (const r of today) {
    const h = kyivHour(r.startedAt)
    byHour[h] = (byHour[h] ?? 0) + 1
    byRegion.set(r.region, (byRegion.get(r.region) ?? 0) + 1)
  }

  const events = today.map(r => toEvent(r, now))
  const finished = events.filter(e => !e.ongoing)
  const pick = (list: AlarmStatsEvent[], better: (a: number, b: number) => boolean): AlarmStatsEvent | null =>
    list.reduce<AlarmStatsEvent | null>((best, e) => (!best || better(e.seconds, best.seconds) ? e : best), null)

  return {
    day,
    recordingSince: recordingSince?.toISOString() ?? null,
    total: today.length,
    previousTotal: recordingSince && kyivDay(recordingSince) < prev ? prevCount : null,
    longest: pick(events, (a, b) => a > b),
    shortest: pick(finished, (a, b) => a < b),
    byHour,
    byRegion: [...byRegion]
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count || a.region.localeCompare(b.region, 'uk'))
  }
}
