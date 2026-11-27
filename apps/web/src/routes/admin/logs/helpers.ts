import { z } from 'zod'
import { LOG_LEVELS, LOG_MAX_LINES, logContainerSchema } from '@carplates/shared'
import type { AdminLogLine, AdminLogsResponse, LogLevel } from '@carplates/shared'

export const RANGE_PRESETS = [
  { id: '15m', ms: 15 * 60_000 },
  { id: '1h', ms: 60 * 60_000 },
  { id: '6h', ms: 6 * 60 * 60_000 },
  { id: '24h', ms: 24 * 60 * 60_000 }
] as const
export const RANGE_IDS = ['15m', '1h', '6h', '24h', 'custom'] as const
export type RangeId = (typeof RANGE_IDS)[number]
export const DEFAULT_RANGE: RangeId = '1h'

export const LIVE_INTERVAL_MS = 5000

export const LEVEL_CLASSES: Record<LogLevel, string> = {
  error: 'bg-red-600/15 text-red-700 dark:text-red-400',
  warn: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  info: 'bg-sky-600/15 text-sky-700 dark:text-sky-400',
  debug: 'bg-[var(--color-border)] text-[var(--color-muted)]'
}

export type LogFilters = {
  container?: string
  levels: LogLevel[]
  q: string
  range: RangeId
  /** ISO, only for `range === 'custom'`. */
  from?: string
  to?: string
  live: boolean
}

const isoSchema = z.iso.datetime({ offset: true })

/** URL search params are user-editable, so every value is validated and falls back to "unset". */
export function parseFilters(params: URLSearchParams): LogFilters {
  const container = logContainerSchema.safeParse(params.get('container'))
  const range = z
    .enum(RANGE_IDS)
    .catch(DEFAULT_RANGE)
    .parse(params.get('range') ?? undefined)
  const from = isoSchema.safeParse(params.get('from'))
  const to = isoSchema.safeParse(params.get('to'))
  const levels = (params.get('level') ?? '').split(',').filter((v): v is LogLevel => LOG_LEVELS.some(l => l === v))
  return {
    container: container.success ? container.data : undefined,
    levels: LOG_LEVELS.filter(l => levels.includes(l)),
    q: (params.get('q') ?? '').slice(0, 200),
    range,
    from: from.success ? from.data : undefined,
    to: to.success ? to.data : undefined,
    live: params.get('live') === '1' && range !== 'custom'
  }
}

/** `undefined` / empty values are removed; the `tab` param is never touched. */
export function applyParams(current: URLSearchParams, patch: Record<string, string | undefined>): URLSearchParams {
  const next = new URLSearchParams(current)
  for (const [key, value] of Object.entries(patch)) {
    if (value) next.set(key, value)
    else next.delete(key)
  }
  return next
}

export const presetMs = (range: RangeId): number | undefined => RANGE_PRESETS.find(p => p.id === range)?.ms

export const lineKey = (line: AdminLogLine): string => `${line.ts}|${line.container}|${line.message}`

/**
 * Live polling asks Loki for `from = newest ts`, which includes that very millisecond again, so lines already shown are
 * dropped by key. Newest first, capped.
 */
export function mergeLiveLines(
  previous: AdminLogsResponse,
  next: AdminLogsResponse,
  cap: number = LOG_MAX_LINES
): AdminLogsResponse {
  const seen = new Set(previous.lines.map(lineKey))
  const fresh = next.lines.filter(line => !seen.has(lineKey(line)))
  const lines = [...fresh, ...previous.lines]
  return {
    ...next,
    lines: lines.slice(0, cap),
    truncated: lines.length > cap || previous.truncated,
    from: previous.from
  }
}

/** `HH:mm:ss.SSS` in the browser's zone. */
export function formatLogTime(ts: string): string {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  const pad = (n: number, w = 2): string => String(n).padStart(w, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}

/** Pretty JSON when the message is a JSON object (Nest / pino lines), else the raw text. */
export function prettyMessage(message: string): string {
  const trimmed = message.trim()
  if (!trimmed.startsWith('{')) return message
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2)
  } catch {
    return message
  }
}

/** `<input type="datetime-local">` value (local time, minutes) from an ISO string. */
export function toLocalInput(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function fromLocalInput(value: string): string | undefined {
  const d = new Date(value)
  return value && !Number.isNaN(d.getTime()) ? d.toISOString() : undefined
}
