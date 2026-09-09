import { normalizePlate } from '@carplates/shared'
import type { RegistrationInsert } from '@carplates/db'

/** DD.MM.YYYY -> YYYY-MM-DD ; anything else -> null */
export function toIsoDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

export const toInt = (raw: string | undefined): number | null => {
  const n = Number.parseInt((raw ?? '').trim(), 10)
  return Number.isFinite(n) ? n : null
}

export const toStr = (raw: string | undefined): string | null => {
  const v = (raw ?? '').trim()
  return v === '' ? null : v
}

/**
 * Map one ';'-split CSV record to an insert row, or null to skip (empty plate).
 * 19 columns = no VIN; 20+ = VIN sits after `model` (index 9).
 */
export function mapRecord(cells: string[], resourceId: string): RegistrationInsert | null {
  const hasVin = cells.length >= 20
  let i = 0
  const person = cells[i++]
  const regAddrKoatuu = cells[i++]
  const operCode = cells[i++]
  const operName = cells[i++]
  const dReg = cells[i++]
  const depCode = cells[i++]
  const dep = cells[i++]
  const brand = cells[i++]
  const model = cells[i++]
  const vin = hasVin ? cells[i++] : undefined
  const makeYear = cells[i++]
  const color = cells[i++]
  const kind = cells[i++]
  const body = cells[i++]
  const purpose = cells[i++]
  const fuel = cells[i++]
  const capacity = cells[i++]
  const ownWeight = cells[i++]
  const totalWeight = cells[i++]
  const nRegNew = cells[i]

  const plate = normalizePlate(nRegNew ?? '')
  if (!plate) return null

  return {
    plate,
    person: toStr(person),
    regAddrKoatuu: toStr(regAddrKoatuu),
    operCode: toInt(operCode),
    operName: toStr(operName),
    dReg: toIsoDate(dReg ?? ''),
    depCode: toStr(depCode),
    dep: toStr(dep),
    brand: toStr(brand),
    model: toStr(model),
    vin: toStr(vin),
    makeYear: toInt(makeYear),
    color: toStr(color),
    kind: toStr(kind),
    body: toStr(body),
    purpose: toStr(purpose),
    fuel: toStr(fuel),
    capacity: toInt(capacity),
    ownWeight: toInt(ownWeight),
    totalWeight: toInt(totalWeight),
    sourceResourceId: resourceId
  }
}

/** A first CSV row is a header if the oper_code column isn't all digits. */
export const looksLikeHeader = (cells: string[]): boolean => !/^\d+$/.test((cells[2] ?? '').trim())
