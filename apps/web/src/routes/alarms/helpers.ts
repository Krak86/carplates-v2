import type { AlarmRegion, AlarmScope } from '@carplates/shared'

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

/** Full-oblast alerts first, then partial; the API already sorts by name and the sort is stable. */
export const sortedAlarms = (regions: readonly AlarmRegion[]): AlarmRegion[] =>
  [...regions].sort((a, b) => Number(b.scope === 'full') - Number(a.scope === 'full'))

/** Static icon per upstream alert type (never a weapon); unknown types get the generic one. */
const ALARM_TYPE_ICON: Readonly<Record<string, string>> = { AIR: '🚨', ARTILLERY: '💥', URBAN_FIGHTS: '⚠️' }

/** Icon of the region's first known type. */
export const alarmTypeIcon = (types: readonly string[]): string =>
  types.map(type => ALARM_TYPE_ICON[type]).find(Boolean) ?? '🚨'
