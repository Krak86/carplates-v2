import { normalizePlate } from '@carplates/shared'
import type { RegistrationInsert } from '@carplates/db'

/**
 * The data.gov.ua vehicle-registration export has changed shape every few
 * years — different column sets, different column order, different date
 * formats — and as of the 2026-09-01 resource, no plate column at all (ГСЦ МВС
 * order №67/ОД, 2026-06-29). Mapping by header name (this file) instead of by
 * position is what survives all of that; a positional parser silently maps the
 * wrong field into the wrong slot the moment two years disagree on order.
 */

/** DD.MM.YYYY, DD.MM.YY, or already-ISO YYYY-MM-DD -> YYYY-MM-DD; anything else -> null. */
export function toIsoDate(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const dmy4 = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (dmy4) return `${dmy4[3]}-${dmy4[2]}-${dmy4[1]}`
  const dmy2 = v.match(/^(\d{2})\.(\d{2})\.(\d{2})$/)
  if (dmy2) return `20${dmy2[3]}-${dmy2[2]}-${dmy2[1]}`
  return null
}

export const toInt = (raw: string | undefined): number | null => {
  const n = Number.parseInt((raw ?? '').trim(), 10)
  return Number.isFinite(n) ? n : null
}

export const toStr = (raw: string | undefined): string | null => {
  const v = (raw ?? '').trim()
  return v === '' ? null : v
}

/** Fields sourced directly from a CSV column, by canonical header name. */
export const CSV_FIELDS = [
  'person',
  'regAddrKoatuu',
  'operCode',
  'operName',
  'dReg',
  'depCode',
  'dep',
  'brand',
  'model',
  'vin',
  'makeYear',
  'color',
  'kind',
  'body',
  'purpose',
  'fuel',
  'capacity',
  'powerKwt',
  'ownWeight',
  'totalWeight',
  'plate'
] as const
export type CsvField = (typeof CSV_FIELDS)[number]

/** One canonical header spelling per field — matched case-insensitively, trimmed. */
const HEADER_ALIASES: Record<CsvField, string> = {
  person: 'PERSON',
  regAddrKoatuu: 'REG_ADDR_KOATUU',
  operCode: 'OPER_CODE',
  operName: 'OPER_NAME',
  dReg: 'D_REG',
  depCode: 'DEP_CODE',
  dep: 'DEP',
  brand: 'BRAND',
  model: 'MODEL',
  vin: 'VIN',
  makeYear: 'MAKE_YEAR',
  color: 'COLOR',
  kind: 'KIND',
  body: 'BODY',
  purpose: 'PURPOSE',
  fuel: 'FUEL',
  capacity: 'CAPACITY',
  powerKwt: 'POWER_KWT',
  ownWeight: 'OWN_WEIGHT',
  totalWeight: 'TOTAL_WEIGHT',
  plate: 'N_REG_NEW'
}

const HEADER_TO_FIELD = new Map<string, CsvField>(
  (Object.entries(HEADER_ALIASES) as [CsvField, string][]).map(([field, header]) => [header, field])
)

/** Column layout resolved once per file from its header row. */
export type Layout = {
  columns: Partial<Record<CsvField, number>>
  /** 2026: `CD.OPER_CODE||'-'||CD.OPERAS` — one column holding "50 - <name>". */
  operCodeNameColumn?: number
}

type HeaderMatch = Layout & { matched: number }

/** The 2026 header echoes the source SQL expression rather than a plain name. */
const isFusedOperHeader = (cell: string): boolean => cell.includes('OPER_CODE') && cell.includes('OPERAS')

function matchHeader(cells: string[]): HeaderMatch {
  const columns: Partial<Record<CsvField, number>> = {}
  let operCodeNameColumn: number | undefined
  let matched = 0
  cells.forEach((raw, idx) => {
    const cell = raw.trim().toUpperCase()
    const field = HEADER_TO_FIELD.get(cell)
    if (field) {
      columns[field] = idx
      matched++
    } else if (isFusedOperHeader(cell)) {
      operCodeNameColumn = idx
      matched++
    }
  })
  return { columns, operCodeNameColumn, matched }
}

/** A row is a header when at least one cell resolves to a known column name. */
export function looksLikeHeader(cells: string[]): boolean {
  return matchHeader(cells).matched > 0
}

/**
 * Resolve a header row to a column layout. Throws when nothing recognizable
 * is found — a silent zero-match layout is exactly how the 2026 file (no
 * `N_REG_NEW`) went from "breaking change" to "zero rows inserted, no error".
 */
export function buildLayout(headerCells: string[]): Layout {
  const { columns, operCodeNameColumn, matched } = matchHeader(headerCells)
  if (matched === 0) {
    throw new Error(`unrecognized CSV header — no known column names found in: ${headerCells.join(';')}`)
  }
  return { columns, operCodeNameColumn }
}

const cell = (layout: Layout, cells: string[], field: CsvField): string | undefined => {
  const idx = layout.columns[field]
  return idx === undefined ? undefined : cells[idx]
}

/** "50 - ВТОРИННА РЕЄСТРАЦІЯ…" -> { operCode: 50, operName: "ВТОРИННА РЕЄСТРАЦІЯ…" }. */
function splitOperCodeName(raw: string): { operCode: number | null; operName: string | null } {
  const m = raw.trim().match(/^(\d+)\s*-\s*(.*)$/)
  return m ? { operCode: toInt(m[1]), operName: toStr(m[2]) } : { operCode: null, operName: toStr(raw) }
}

/**
 * oper_code / oper_name, uniform across every layout:
 * - 2026: one fused column, split on the first "N - ".
 * - 2013-2019: separate columns, but `oper_name` repeats the code as a prefix
 *   ("40 - ВТОРИННА…") — stripped here so stored names match 2020+.
 */
function resolveOperCodeName(cells: string[], layout: Layout): { operCode: number | null; operName: string | null } {
  if (layout.operCodeNameColumn !== undefined) {
    return splitOperCodeName(cells[layout.operCodeNameColumn] ?? '')
  }
  const operCode = toInt(cell(layout, cells, 'operCode'))
  const rawName = toStr(cell(layout, cells, 'operName'))
  if (!rawName) return { operCode, operName: null }
  const prefixed = rawName.match(/^\d+\s*-\s*(.*)$/)
  return { operCode, operName: prefixed ? (toStr(prefixed[1]) ?? rawName) : rawName }
}

/**
 * Map one CSV record to an insert row using a layout built from that file's
 * header, or null to skip (no plate and no VIN — nothing to key the row on).
 */
export function mapRecord(cells: string[], layout: Layout, resourceId: string): RegistrationInsert | null {
  const plateRaw = cell(layout, cells, 'plate')
  const normalizedPlate = plateRaw === undefined ? '' : normalizePlate(plateRaw)
  const plate = normalizedPlate === '' ? null : normalizedPlate
  const vin = toStr(cell(layout, cells, 'vin'))
  if (!plate && !vin) return null

  const { operCode, operName } = resolveOperCodeName(cells, layout)

  return {
    plate,
    vin,
    person: toStr(cell(layout, cells, 'person')),
    regAddrKoatuu: toStr(cell(layout, cells, 'regAddrKoatuu')),
    operCode,
    operName,
    dReg: toIsoDate(cell(layout, cells, 'dReg') ?? ''),
    depCode: toStr(cell(layout, cells, 'depCode')),
    dep: toStr(cell(layout, cells, 'dep')),
    brand: toStr(cell(layout, cells, 'brand')),
    model: toStr(cell(layout, cells, 'model')),
    makeYear: toInt(cell(layout, cells, 'makeYear')),
    color: toStr(cell(layout, cells, 'color')),
    kind: toStr(cell(layout, cells, 'kind')),
    body: toStr(cell(layout, cells, 'body')),
    purpose: toStr(cell(layout, cells, 'purpose')),
    fuel: toStr(cell(layout, cells, 'fuel')),
    capacity: toInt(cell(layout, cells, 'capacity')),
    powerKwt: toInt(cell(layout, cells, 'powerKwt')),
    ownWeight: toInt(cell(layout, cells, 'ownWeight')),
    totalWeight: toInt(cell(layout, cells, 'totalWeight')),
    sourceResourceId: resourceId
  }
}
