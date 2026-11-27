import { describe, expect, it } from 'vitest'
import { LOG_MAX_WINDOW_MS } from '@carplates/shared'

import { buildLogql, clampLimit, escapeLogqlString, escapeRegex, msToNs, nsToIso, resolveWindow } from './helpers.js'

/** Index of the quote that closes the string literal opened at `open` (an escaped quote does not close it). */
function literalEnd(source: string, open: number): number {
  for (let i = open + 1; i < source.length; i++) {
    if (source[i] === '\\') i++
    else if (source[i] === '"') return i
  }
  return -1
}

describe('escapeLogqlString', () => {
  it('escapes backslashes, quotes and line breaks', () => {
    expect(escapeLogqlString('a"b\\c\nd\re\tf')).toBe('a\\"b\\\\c\\nd\\re\\tf')
  })

  it('drops other control characters', () => {
    expect(escapeLogqlString('a\u0000b\u001bc\u007fd')).toBe('abcd')
  })
})

describe('escapeRegex', () => {
  it('makes metacharacters literal', () => {
    expect(escapeRegex('a.b*c(d)|e[f]{g}^$+?\\')).toBe('a\\.b\\*c\\(d\\)\\|e\\[f\\]\\{g\\}\\^\\$\\+\\?\\\\')
  })
})

describe('buildLogql', () => {
  it('selects every container with no filters', () => {
    expect(buildLogql({})).toBe('{container=~".+"}')
  })

  it('adds container, levels and a case-insensitive literal filter', () => {
    expect(buildLogql({ container: 'carsua-api-blue-1', level: ['error', 'warn'], q: 'timeout' })).toBe(
      '{container="carsua-api-blue-1", level=~"error|warn"} |~ "(?i)timeout"'
    )
  })

  it('skips the level matcher when all levels are picked', () => {
    expect(buildLogql({ level: ['error', 'warn', 'info', 'debug'] })).toBe('{container=~".+"}')
  })

  it('masks a raw plate in the search text, like the stored lines', () => {
    expect(buildLogql({ q: 'AA1234BB' })).toBe('{container=~".+"} |~ "(?i)AA\\\\*\\\\*\\\\*\\\\*BB"')
  })

  const attacks = [
    '" } | json | label_format x="',
    '`; drop',
    '|= "a" or {container=~".*"}',
    '}{container=~".+"}',
    'x" |~ ".*',
    '\\", container=~".+',
    '\\',
    '"',
    'a\nb"}',
    '(?s).*',
    '.*'
  ]

  for (const q of attacks) {
    it(`keeps the search text inside one string literal: ${JSON.stringify(q)}`, () => {
      const logql = buildLogql({ container: 'carsua-api-blue-1', level: ['error'], q })
      const marker = ' |~ "'
      const start = logql.indexOf(marker)
      expect(start).toBeGreaterThan(-1)
      const open = start + marker.length - 1
      expect(literalEnd(logql, open)).toBe(logql.length - 1)
      // exactly one selector and one filter stage, nothing smuggled in between
      expect(logql.slice(0, start)).toBe('{container="carsua-api-blue-1", level=~"error"}')
    })
  }

  it('escapes a container name in the matcher even though the schema already restricts it', () => {
    expect(buildLogql({ container: 'a"}|x' })).toBe('{container="a\\"}|x"}')
  })

  it('ignores unknown level values', () => {
    expect(buildLogql({ level: ['error', 'x" or 1' as never] })).toBe('{container=~".+", level=~"error"}')
  })
})

describe('resolveWindow', () => {
  const now = Date.parse('2026-11-27T12:00:00Z')

  it('defaults to the last hour', () => {
    expect(resolveWindow(undefined, undefined, now)).toEqual({ fromMs: now - 3_600_000, toMs: now })
  })

  it('caps the span at 24 h and keeps `to`', () => {
    const w = resolveWindow('2026-11-01T00:00:00Z', '2026-11-27T11:00:00Z', now)
    expect(w.toMs).toBe(Date.parse('2026-11-27T11:00:00Z'))
    expect(w.toMs - w.fromMs).toBe(LOG_MAX_WINDOW_MS)
  })

  it('keeps a short explicit window', () => {
    const w = resolveWindow('2026-11-27T11:30:00Z', '2026-11-27T11:45:00Z', now)
    expect(w.toMs - w.fromMs).toBe(15 * 60_000)
  })
})

describe('units', () => {
  it('clamps the line limit to 1..500', () => {
    expect([clampLimit(0), clampLimit(200.7), clampLimit(9999)]).toEqual([1, 200, 500])
  })

  it('converts ms <-> ns', () => {
    expect(msToNs(1_700_000_000_123)).toBe('1700000000123000000')
    expect(nsToIso('1700000000123456789')).toBe('2023-11-14T22:13:20.123Z')
  })
})
