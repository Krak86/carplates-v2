import type { WantedVehicleInsert } from '@carplates/db'
import { isVin, normalizePlate } from '@carplates/shared'

/** One record of the National Police `CarsWanted.json` feed (all fields may be null). */
export type WantedFeedRow = {
  id?: string | null
  brand?: string | null
  model?: string | null
  cartype?: string | null
  color?: string | null
  vehiclenumber?: string | null
  bodynumber?: string | null
  chassisnumber?: string | null
  illegalseizuredate?: string | null
  insertdate?: string | null
  organunit?: string | null
}

const text = (v: string | null | undefined): string | null => {
  const t = v?.trim()
  return t ? t : null
}

/** `2022-08-05T15:00:00Z` → `2022-08-05`; placeholder years (`0200-…`) → null. */
export function feedDate(v: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v ?? '')
  return m && Number(m[1]) >= 1900 ? `${m[1]}-${m[2]}-${m[3]}` : null
}

/** VIN-shaped numbers of a record: the body number and/or the chassis number (both can be one — a local body number beside the real VIN). */
export function feedVins(row: WantedFeedRow): string[] {
  const found: string[] = []
  for (const candidate of [row.bodynumber, row.chassisnumber]) {
    const v = candidate?.replace(/\s+/g, '').toUpperCase()
    if (v && isVin(v) && !found.includes(v)) found.push(v)
  }
  return found
}

export function toWantedInsert(row: WantedFeedRow): Omit<WantedVehicleInsert, 'lastSeenAt'> | null {
  const sourceId = text(row.id)
  if (!sourceId) return null
  const plate = text(row.vehiclenumber)
  const [vin = null, vinAlt = null] = feedVins(row)
  return {
    sourceId,
    plate: plate ? normalizePlate(plate) : null,
    vin,
    vinAlt,
    brand: text(row.brand),
    model: text(row.model),
    vehicleType: text(row.cartype),
    color: text(row.color),
    seizedAt: feedDate(row.illegalseizuredate),
    registeredAt: feedDate(row.insertdate),
    organUnit: text(row.organunit)
  }
}
