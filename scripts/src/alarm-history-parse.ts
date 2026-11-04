/**
 * Rolls the MIT-licensed siren dataset (Vadimkin/ukrainian-air-raid-sirens-dataset) up to one row per oblast, source and day.
 *
 * Official rows are oblast level until late 2025 and raion level after, so rows are never counted one by one: the intervals of
 * an oblast are merged first (overlaps and touching intervals become one continuous alert period), then each period is
 * attributed to the UTC day it started on (a period crossing midnight is not split). A period is "estimated" when any
 * volunteer row in it has `naive=True` (its end is start + 30 min, not observed).
 * Crimea, Sevastopol and the permanent Luhansk alert are in neither file: callers must say so wherever they show the data.
 */
import { REGIONS } from '@carplates/shared'

export const ALARM_HISTORY_SOURCES = ['official', 'volunteer'] as const
export type AlarmHistorySource = (typeof ALARM_HISTORY_SOURCES)[number]

export type AlarmHistoryDay = {
  region: string
  source: AlarmHistorySource
  /** YYYY-MM-DD (UTC) */
  day: string
  alerts: number
  seconds: number
  longestSeconds: number
  estimatedAlerts: number
}

/** The dataset's English oblast names -> the plate-region names used everywhere else (`REGIONS` values). */
const EN_TO_REGION: Readonly<Record<string, string>> = {
  'Cherkaska oblast': 'Черкаська область',
  'Chernihivska oblast': 'Чернігівська область',
  'Chernivetska oblast': 'Чернівецька область',
  'Dnipropetrovska oblast': 'Дніпропетровська область',
  'Donetska oblast': 'Донецька область',
  'Ivano-Frankivska oblast': 'Івано-Франківська область',
  'Kharkivska oblast': 'Харківська область',
  'Khersonska oblast': 'Херсонська область',
  'Khmelnytska oblast': 'Хмельницька область',
  'Kirovohradska oblast': 'Кіровоградська область',
  'Kyiv City': 'Київ',
  'Kyivska oblast': 'Київська область',
  'Luhanska oblast': 'Луганська область',
  'Lvivska oblast': 'Львівська область',
  'Mykolaivska oblast': 'Миколаївська область',
  'Odeska oblast': 'Одеська область',
  'Poltavska oblast': 'Полтавська область',
  'Rivnenska oblast': 'Рівненська область',
  'Sumska oblast': 'Сумська область',
  'Ternopilska oblast': 'Тернопільська область',
  'Vinnytska oblast': 'Вінницька область',
  'Volynska oblast': 'Волинська область',
  'Zakarpatska oblast': 'Закарпатська область',
  'Zaporizka oblast': 'Запорізька область',
  'Zhytomyrska oblast': 'Житомирська область'
}

const KNOWN_REGIONS = new Set(Object.values(REGIONS))

export const regionOf = (englishName: string | undefined): string | undefined => {
  const region = englishName ? EN_TO_REGION[englishName.trim()] : undefined
  return region && KNOWN_REGIONS.has(region) ? region : undefined
}

/** "2022-03-15 16:10:34+00:00" -> ms; undefined when empty or invalid. */
export const parseTimestamp = (raw: string | undefined): number | undefined => {
  if (!raw) return undefined
  const ms = Date.parse(raw.trim().replace(' ', 'T'))
  return Number.isNaN(ms) ? undefined : ms
}

export type AlarmInterval = { region: string; start: number; end: number; estimated: boolean }

/** Merges overlapping or touching intervals of one region; the result is sorted and disjoint. */
export function mergeIntervals(intervals: readonly AlarmInterval[]): AlarmInterval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start)
  const merged: AlarmInterval[] = []
  for (const i of sorted) {
    const last = merged[merged.length - 1]
    if (last && i.start <= last.end) {
      last.end = Math.max(last.end, i.end)
      last.estimated ||= i.estimated
    } else merged.push({ ...i })
  }
  return merged
}

export function rollupByDay(source: AlarmHistorySource, intervals: readonly AlarmInterval[]): AlarmHistoryDay[] {
  const byRegion = new Map<string, AlarmInterval[]>()
  for (const i of intervals) {
    const list = byRegion.get(i.region)
    if (list) list.push(i)
    else byRegion.set(i.region, [i])
  }
  const days = new Map<string, AlarmHistoryDay>()
  for (const [region, list] of byRegion) {
    for (const period of mergeIntervals(list)) {
      const day = new Date(period.start).toISOString().slice(0, 10)
      const key = `${region}|${day}`
      const seconds = Math.round((period.end - period.start) / 1000)
      const row = days.get(key) ?? { region, source, day, alerts: 0, seconds: 0, longestSeconds: 0, estimatedAlerts: 0 }
      row.alerts += 1
      row.seconds += seconds
      row.longestSeconds = Math.max(row.longestSeconds, seconds)
      row.estimatedAlerts += period.estimated ? 1 : 0
      days.set(key, row)
    }
  }
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day) || a.region.localeCompare(b.region))
}

export type ParsedRows = { intervals: AlarmInterval[]; skipped: number }

function collect(
  records: readonly Record<string, string>[],
  name: (r: Record<string, string>) => string | undefined,
  estimated: (r: Record<string, string>) => boolean
): ParsedRows {
  const intervals: AlarmInterval[] = []
  let skipped = 0
  for (const r of records) {
    const region = regionOf(name(r))
    const start = parseTimestamp(r.started_at)
    const end = parseTimestamp(r.finished_at)
    if (!region || start === undefined || end === undefined || end < start) skipped++
    else intervals.push({ region, start, end, estimated: estimated(r) })
  }
  return { intervals, skipped }
}

/** `official_data_en.csv` records (columns oblast, started_at, finished_at). Rows without a region or a valid span are skipped. */
export const intervalsFromOfficial = (records: readonly Record<string, string>[]): ParsedRows =>
  collect(
    records,
    r => r.oblast,
    () => false
  )

/** `volunteer_data_en.csv` records (columns region, started_at, finished_at, naive). */
export const intervalsFromVolunteer = (records: readonly Record<string, string>[]): ParsedRows =>
  collect(
    records,
    r => r.region,
    r => r.naive?.trim().toLowerCase() === 'true'
  )
