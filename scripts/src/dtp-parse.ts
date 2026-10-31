import type { DtpHazardSectionInsert } from '@carplates/db'
import { REGION_NAMES } from '@carplates/shared'
import { parse } from 'csv-parse/sync'

export type HazardKind = 'hazard' | 'concentration'

/** Ukraine's bounding box: a coordinate outside it is a typo in the source, never a place on the map. */
const LAT_RANGE = [44, 53] as const
const LON_RANGE = [22, 41] as const

/**
 * CSV column header → field. Header-name-driven like `transform.ts`: the headers are English, the values Ukrainian, and the
 * first header is `№` or `№ ` (trailing space). `rate` and `hazardLevel` exist only in the concentration-places file.
 */
const HEADER_FIELDS: readonly (readonly [RegExp, keyof HazardCells])[] = [
  [/^№/, 'seq'],
  [/^region$/i, 'region'],
  [/^road index$/i, 'roadCode'],
  [/^road name$/i, 'roadName'],
  [/^section start/i, 'kmStart'],
  [/^section end/i, 'kmEnd'],
  [/^gps coordinates, start/i, 'gpsStart'],
  [/^gps coordinates, end/i, 'gpsEnd'],
  [/^accident rate coefficient/i, 'rate'],
  [/^hazard level/i, 'hazardLevel'],
  [/^number of road accidents/i, 'crashes3y']
]

type HazardCells = Record<
  | 'seq'
  | 'region'
  | 'roadCode'
  | 'roadName'
  | 'kmStart'
  | 'kmEnd'
  | 'gpsStart'
  | 'gpsEnd'
  | 'rate'
  | 'hazardLevel'
  | 'crashes3y',
  string | undefined
>

const REQUIRED_FIELDS: readonly (keyof HazardCells)[] = ['seq', 'region', 'roadCode', 'roadName']

/** Column index per field; throws when a required column is missing (a renamed header must not yield zero rows silently). */
export function hazardLayout(headerCells: string[]): Partial<Record<keyof HazardCells, number>> {
  const layout: Partial<Record<keyof HazardCells, number>> = {}
  headerCells.forEach((raw, idx) => {
    const cell = raw.replace(/^\uFEFF/, '').trim()
    const hit = HEADER_FIELDS.find(([re]) => re.test(cell))
    if (hit) layout[hit[1]] = idx
  })
  const missing = REQUIRED_FIELDS.filter(f => layout[f] === undefined)
  if (missing.length > 0) {
    throw new Error(`hazard CSV: missing column(s) ${missing.join(', ')} in header: ${headerCells.join(';')}`)
  }
  return layout
}

/** Region as written in the files (`Вінницька`, `Дніпропетровська `, `м. Київ`) → the canonical `plate_regions` name, or null. */
export function dtpRegion(raw: string | null | undefined): string | null {
  const name = raw?.replace(/\*/g, '').trim()
  if (!name) return null
  if (/^(м\.?\s*)?київ$/i.test(name)) return 'Київ'
  const hit = [name, `${name} область`, name.replace(/\s+обл\.?$/i, ' область')].find(c => REGION_NAMES.includes(c))
  return hit ?? null
}

/** Cyrillic letters that the files sometimes type as their Latin look-alikes (`P-17` for `Р-17`). */
const LATIN_TO_CYRILLIC: Readonly<Record<string, string>> = { M: 'М', P: 'Р', T: 'Т', H: 'Н' }

/**
 * `М-30 ` → `М-30`, `P-17` → `Р-17`, `Р-84 (Т-14-19)` → `Р-84`; empty → null. The first token wins, so a road known under two
 * codes joins on the first one only.
 */
export function roadCode(raw: string | null | undefined): string | null {
  const token = raw?.trim().split(/\s+/)[0]?.toUpperCase()
  if (!token || !/^[A-ZА-ЯІЇЄ]-\d/.test(token)) return null
  return (LATIN_TO_CYRILLIC[token[0] as string] ?? token[0]) + token.slice(1)
}

/** `351+200 ` → 351200 (metres from the road start); anything else → null. */
export function kmToMetres(raw: string | null | undefined): number | null {
  const m = /^(\d+)\s*\+\s*(\d+)$/.exec(raw?.trim() ?? '')
  return m ? Number(m[1]) * 1000 + Number(m[2]) : null
}

/**
 * `49.339347 28.063269`, `49.40688022, 28.52797257` → [lat, lon]. Null when the cell holds fewer than two numbers, one of them is
 * glued (`48.4328426, 364633821`) or the pair falls outside Ukraine: the cell is never guessed at.
 */
export function gpsPair(raw: string | null | undefined): [number, number] | null {
  const m = /^\s*(\d{2}\.\d+)[,\s]+(\d{2}\.\d+)\s*$/.exec(raw ?? '')
  if (!m) return null
  const lat = Number(m[1])
  const lon = Number(m[2])
  const inside = lat >= LAT_RANGE[0] && lat <= LAT_RANGE[1] && lon >= LON_RANGE[0] && lon <= LON_RANGE[1]
  return inside ? [lat, lon] : null
}

/** `0,5` → 0.5; empty, `null` or garbage → null. */
export function decimalCell(raw: string | null | undefined): number | null {
  const v = raw?.trim().replace(',', '.')
  if (!v || !/^\d+(\.\d+)?$/.test(v)) return null
  return Number(v)
}

/** Whole-number cell; empty or garbage → null. */
export function intCell(raw: string | null | undefined): number | null {
  const v = raw?.trim()
  return v && /^\d+$/.test(v) ? Number(v) : null
}

export type HazardParse = {
  rows: number
  sections: DtpHazardSectionInsert[]
  /** Rows dropped: no sequence number, unknown region or no usable road code. */
  invalid: number
  /** Kept rows whose start GPS failed validation (stored without coordinates). */
  noCoords: number
}

/** One hazardous-sections / concentration-places CSV (semicolon-separated, BOM) → rows for `registry.dtp_hazard_section`. */
export function parseHazardCsv(text: string, year: number, kind: HazardKind): HazardParse {
  const records: string[][] = parse(text, {
    delimiter: ';',
    bom: true,
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true
  })
  const header = records.shift()
  if (!header) throw new Error('hazard CSV: empty file')
  const layout = hazardLayout(header)
  const cell = (r: string[], f: keyof HazardCells): string | undefined => {
    const idx = layout[f]
    return idx === undefined ? undefined : r[idx]
  }

  const sections: DtpHazardSectionInsert[] = []
  let invalid = 0
  let noCoords = 0
  for (const r of records) {
    const seq = intCell(cell(r, 'seq'))
    const region = dtpRegion(cell(r, 'region'))
    const code = roadCode(cell(r, 'roadCode'))
    if (seq === null || !region) {
      invalid++
      continue
    }
    const start = gpsPair(cell(r, 'gpsStart'))
    const end = gpsPair(cell(r, 'gpsEnd'))
    if (!start) noCoords++
    const level = cell(r, 'hazardLevel')?.trim()
    sections.push({
      year,
      kind,
      seq,
      region,
      roadCode: code ?? '',
      roadName: (cell(r, 'roadName') ?? '').trim().replace(/\s+/g, ' '),
      kmStart: kmToMetres(cell(r, 'kmStart')),
      kmEnd: kmToMetres(cell(r, 'kmEnd')),
      latStart: start?.[0] ?? null,
      lonStart: start?.[1] ?? null,
      latEnd: end?.[0] ?? null,
      lonEnd: end?.[1] ?? null,
      crashes3y: intCell(cell(r, 'crashes3y')),
      rate: decimalCell(cell(r, 'rate')),
      hazardLevel: level && level !== 'null' ? level : null
    })
  }
  return { rows: records.length, sections, invalid, noCoords }
}
