import { DEFAULT_LOG_WINDOW_MS, LOG_LEVELS, LOG_MAX_WINDOW_MS, LOG_MAX_LINES, redactLogText } from '@carplates/shared'
import type { LogLevel } from '@carplates/shared'

import type { LogFilter, LogWindow } from './types.js'

/**
 * Escapes text for a double-quoted LogQL string (Go rules): backslash and quote get a backslash, line breaks become
 * `\n` / `\r` / `\t`, every other control character is dropped. Nothing else is special inside double quotes.
 */
export function escapeLogqlString(value: string): string {
  let out = ''
  for (const ch of value) {
    const code = ch.charCodeAt(0)
    if (ch === '\\') out += '\\\\'
    else if (ch === '"') out += '\\"'
    else if (ch === '\n') out += '\\n'
    else if (ch === '\r') out += '\\r'
    else if (ch === '\t') out += '\\t'
    else if (code < 0x20 || code === 0x7f) continue
    else out += ch
  }
  return out
}

/** RE2 metacharacters made literal, so a search term can never become a pattern. */
export const escapeRegex = (value: string): string => value.replace(/[\\.+*?()|[\]{}^$]/g, '\\$&')

/**
 * The whole LogQL query, built from validated fields only (the client never sends LogQL). Labels are `container` and
 * `level`; the optional text filter is a case-insensitive literal. A plate / VIN / e-mail in `q` is masked first, because
 * the stored lines are masked, so searching a raw plate finds its masked form.
 */
export function buildLogql({ container, level, q }: LogFilter): string {
  const matchers = [container ? `container="${escapeLogqlString(container)}"` : 'container=~".+"']
  const levels = [...new Set(level ?? [])].filter((l): l is LogLevel => LOG_LEVELS.includes(l))
  if (levels.length > 0 && levels.length < LOG_LEVELS.length) matchers.push(`level=~"${levels.join('|')}"`)
  const needle = q ? redactLogText(q.trim()) : ''
  const filter = needle ? ` |~ "${escapeLogqlString(`(?i)${escapeRegex(needle)}`)}"` : ''
  return `{${matchers.join(', ')}}${filter}`
}

/** `to` defaults to now, `from` to an hour earlier; a longer span keeps `to` and pulls `from` up to the 24 h cap. */
export function resolveWindow(from: string | undefined, to: string | undefined, now: number = Date.now()): LogWindow {
  const toMs = to ? Date.parse(to) : now
  const fromRaw = from ? Date.parse(from) : toMs - DEFAULT_LOG_WINDOW_MS
  return { toMs, fromMs: Math.max(fromRaw, toMs - LOG_MAX_WINDOW_MS) }
}

export const clampLimit = (limit: number): number => Math.min(Math.max(Math.trunc(limit), 1), LOG_MAX_LINES)

/** Epoch ms to the unix-nanosecond string Loki expects. */
export const msToNs = (ms: number): string => `${Math.trunc(ms)}000000`

/** Loki's unix-ns string to an ISO time (millisecond precision). */
export const nsToIso = (ns: string): string => new Date(Number(BigInt(ns) / 1_000_000n)).toISOString()
