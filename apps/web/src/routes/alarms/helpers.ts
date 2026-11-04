import type { AlarmArea, AlarmRegion, AlarmScope } from '@carplates/shared'

export type AlarmStatus = AlarmScope | 'none'

/** Fill per status; the map never relies on colour alone (list + aria-label carry the text). */
export const ALARM_FILL: Readonly<Record<AlarmStatus, string>> = {
  full: 'var(--chip-safety)',
  partial: 'color-mix(in oklab, var(--chip-safety) 45%, var(--color-surface))',
  none: 'var(--color-border)'
}

/** Status of a plate region name in a `/api/alarms` answer (`none` = answered, no alert there). */
export const statusOf = (regions: readonly AlarmRegion[], region: string | undefined): AlarmStatus =>
  regions.find(r => r.region === region)?.scope ?? 'none'

/** Fill of an alerted area by its upstream level (Yellow = warmer tint); `soft` = fallback for an area we cannot place. */
export const levelFill = (level: string | null | undefined, soft: boolean): string => {
  const scope: AlarmScope = soft ? 'partial' : 'full'
  return level === 'Yellow' ? ALARM_FILL_YELLOW[scope] : ALARM_FILL[scope]
}

/** Warmer tint for a region whose upstream `level` is Yellow (list shows the raw level; meaning unconfirmed). */
const ALARM_FILL_YELLOW: Readonly<Record<AlarmScope, string>> = {
  full: 'oklch(0.8 0.16 85)',
  partial: 'color-mix(in oklab, oklch(0.8 0.16 85) 55%, var(--color-surface))'
}

/** Full-oblast alerts first, then partial; the API already sorts by name and the sort is stable. */
export const sortedAlarms = (regions: readonly AlarmRegion[]): AlarmRegion[] =>
  [...regions].sort((a, b) => Number(b.scope === 'full') - Number(a.scope === 'full'))

/** Static icon per upstream alert type (never a weapon); unknown types get the generic one. */
const ALARM_TYPE_ICON: Readonly<Record<string, string>> = { AIR: '🚨', ARTILLERY: '💥', URBAN_FIGHTS: '⚠️' }

/** Icon of the region's first known type. */
export const alarmTypeIcon = (types: readonly string[]): string =>
  types.map(type => ALARM_TYPE_ICON[type]).find(Boolean) ?? '🚨'

const KYIV = 'Europe/Kyiv'
const DAY_MS = 86_400_000
const kyivDayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: KYIV,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

/** Kyiv calendar day (`YYYY-MM-DD`) of an ISO time; alerts are shown on the Ukrainian day, whatever the viewer's zone. */
export const kyivDayKey = (iso: string): string => kyivDayFormat.format(new Date(iso))

/** Whole Kyiv calendar days between an alert start and now: 0 = today, 1 = yesterday. */
export const daysAgo = (sinceIso: string, nowIso: string): number =>
  Math.round((Date.parse(`${kyivDayKey(nowIso)}T00:00:00Z`) - Date.parse(`${kyivDayKey(sinceIso)}T00:00:00Z`)) / DAY_MS)

export type DurationUnits = { d: string; h: string; m: string }

/** "25 min", "1 h 14 min", "1 d 15 h 3 min": days and hours only when non-zero; minutes always unless days/hours already show. */
export const formatAlarmDuration = (ms: number, units: DurationUnits): string => {
  const total = Math.max(0, Math.floor(ms / 60_000))
  const d = Math.floor(total / 1440)
  const h = Math.floor((total % 1440) / 60)
  const m = total % 60
  const parts: string[] = []
  if (d > 0) parts.push(`${d} ${units.d}`)
  if (h > 0) parts.push(`${h} ${units.h}`)
  if (m > 0 || parts.length === 0) parts.push(`${m} ${units.m}`)
  return parts.join(' ')
}

/** One list row: an alerted area with its start (null when the feed gave none). */
export type AlarmRow = { key: string; area: AlarmArea; since: string | null }

/** Areas of a region, newest alert first; areas without a start go last. */
export const regionRows = (region: AlarmRegion): AlarmRow[] =>
  region.areas
    .map((area, i) => ({ key: `${region.region}:${area.name}:${i}`, area, since: area.since ?? null }))
    .sort((a, b) => (b.since ? Date.parse(b.since) : -1) - (a.since ? Date.parse(a.since) : -1))

/** Keeps the regions (and inside them the areas) whose name matches; a matching region name keeps all of its areas. */
export const filterAlarmRegions = (
  regions: readonly AlarmRegion[],
  query: string,
  regionLabel: (region: string) => string
): AlarmRegion[] => {
  const q = query.trim().toLocaleLowerCase('uk')
  if (!q) return [...regions]
  const has = (s: string): boolean => s.toLocaleLowerCase('uk').includes(q)
  return regions.flatMap(r => {
    if (has(regionLabel(r.region)) || has(r.region)) return [r]
    const areas = r.areas.filter(a => has(a.name))
    return areas.length > 0 ? [{ ...r, areas }] : []
  })
}
