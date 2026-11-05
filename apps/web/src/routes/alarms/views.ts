/** Views (tabs) of `/alarms`, chosen with `?view=`. Every view draws the same live alarm map; see `AlarmMapCard`. */
export const ALARM_VIEWS = ['live', 'cars'] as const
export type AlarmView = (typeof ALARM_VIEWS)[number]

export const DEFAULT_ALARM_VIEW: AlarmView = 'live'

/** Unknown or missing `?view=` falls back to the classic view, so old links keep working. */
export const parseAlarmView = (raw: string | null | undefined): AlarmView =>
  ALARM_VIEWS.find(v => v === raw) ?? DEFAULT_ALARM_VIEW
