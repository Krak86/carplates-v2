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

/**
 * Police unit → region (`REGION_NAMES`). The unit names its own oblast LAST (`… ГУНП В КИЇВСЬКІЙ ОБЛАСТІ`), while a district earlier in
 * the name can echo another one (`КИЇВСЬКЕ … ГУНП В ОДЕСЬКІЙ ОБЛ.`, `ДНІПРОВСЬКЕ … В М. КИЄВІ`) — so the rightmost match wins.
 */
const REGION_RULES: readonly (readonly [string, RegExp])[] = [
  ['Вінницька область', /ВІННИЦ/g],
  ['Волинська область', /ВОЛИНСЬК|ВОЛИНІ/g],
  ['Дніпропетровська область', /ДНІПРОПЕТР/g],
  ['Донецька область', /ДОНЕЦЬК|ДОНЕЧЧ/g],
  ['Житомирська область', /ЖИТОМИР/g],
  ['Закарпатська область', /ЗАКАРПАТ/g],
  ['Запорізька область', /ЗАПОРІЗЬК[А-ЯІЇ]{1,2}\s+ОБЛ/g],
  ['Івано-Франківська область', /ІВАНО-ФРАНК/g],
  ['Київська область', /КИЇВСЬК[А-ЯІЇ]{1,2}\s+ОБЛ/g],
  ['Київ', /М\.?\s*КИЄВ|Г\.?\s*КИЕВ/g],
  ['Кіровоградська область', /КІРОВОГРАД|КРОПИВНИЦЬК[А-ЯІЇ]{1,2}\s+ОБЛ/g],
  ['Луганська область', /ЛУГАНСЬК|ЛУГАНЩ/g],
  ['Львівська область', /ЛЬВІВСЬК[А-ЯІЇ]{1,2}\s+ОБЛ/g],
  ['Миколаївська область', /МИКОЛАЇВСЬК[А-ЯІЇ]{1,2}\s+ОБЛ/g],
  ['Одеська область', /ОДЕСЬК[А-ЯІЇ]{1,2}\s+ОБЛ/g],
  ['Полтавська область', /ПОЛТАВСЬК[А-ЯІЇ]{1,2}\s+ОБЛ/g],
  ['Рівненська область', /РІВНЕНС/g],
  ['Сумська область', /СУМСЬК[А-ЯІЇ]{1,2}\s+ОБЛ/g],
  ['Тернопільська область', /ТЕРНОП/g],
  ['Харківська область', /ХАРК[ІИ]В[ЬС]*К[А-ЯІЇ]{1,2}\s+ОБЛ/g],
  ['Херсонська область', /ХЕРСОНСЬК[А-ЯІЇ]{1,2}\s+ОБЛ/g],
  ['Хмельницька область', /ХМЕЛЬНИЦ/g],
  ['Черкаська область', /ЧЕРКАС/g],
  ['Чернігівська область', /ЧЕРНІГІВ/g],
  ['Чернівецька область', /ЧЕРНІВЕЦ/g],
  ['АР Крим', /КРИМ|КРЫМ/g],
  ['Севастополь', /СЕВАСТ/g]
]

export function organUnitRegion(unit: string | null | undefined): string | null {
  const u = unit?.toUpperCase()
  if (!u) return null
  let best: string | null = null
  let bestAt = -1
  for (const [region, re] of REGION_RULES) {
    for (const m of u.matchAll(re)) {
      if (m.index > bestAt) {
        bestAt = m.index
        best = region
      }
    }
  }
  return best
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
  const organUnit = text(row.organunit)
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
    organUnit,
    region: organUnitRegion(organUnit)
  }
}
