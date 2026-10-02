import { gramsPerMileToGramsPerKm, KM_PER_MILE, makeKey, modelKey, type VehicleFuel } from '@carplates/shared'
import type { FuelEconomyInsert } from '@carplates/db'

const SOURCE = 'epa'
const CYCLE = 'EPA'
/** 100 km in litres = 235.215 / mpg(US) — the standard conversion. */
const MPG_TO_L_100KM = 235.215

const FUEL_CATEGORY_BY_EPA_TYPE: ReadonlyArray<{ test: RegExp; category: VehicleFuel }> = [
  { test: /electricity/i, category: 'electric' },
  { test: /diesel/i, category: 'diesel' },
  { test: /natural gas|cng|lpg/i, category: 'gas' },
  { test: /hydrogen/i, category: 'hydrogen' },
  { test: /gasoline|gas/i, category: 'petrol' }
]

export function epaFuelCategory(fuelType1: string): VehicleFuel | null {
  return FUEL_CATEGORY_BY_EPA_TYPE.find(f => f.test.test(fuelType1))?.category ?? null
}

/** EPA `atvType` → our powertrain. Anything not electrified (Diesel, FFV, Bifuel, CNG, blank) is plain combustion. */
export function epaPowertrain(atvType: string | undefined): FuelEconomyInsert['powertrain'] {
  const v = (atvType ?? '').trim().toLowerCase()
  if (v === 'plug-in hybrid') return 'phev'
  if (v === 'hybrid') return 'hybrid'
  if (v === 'ev') return 'ev'
  if (v === 'fcv') return 'fcev'
  return 'ice'
}

const num = (v: string | undefined): number | null => {
  if (v == null || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** One fueleconomy.gov `vehicles.csv` record (header-name keyed) → a normalized row, or null if unusable. */
export function parseEpaRow(rec: Record<string, string>): FuelEconomyInsert | null {
  const make = rec.make?.trim()
  const model = rec.model?.trim()
  const year = num(rec.year)
  const id = rec.id?.trim()
  const fuelType = rec.fuelType1?.trim()
  const mk = makeKey(make)
  const mdk = modelKey(model)
  if (!id || !make || !model || !year || !fuelType || !mk || !mdk) return null
  const category = epaFuelCategory(fuelType)
  if (!category) return null

  const co2GPerMile = num(rec.co2TailpipeGpm)
  const mpg = num(rec.comb08)
  const kwhPer100mi = num(rec.combE)
  const displ = num(rec.displ)
  const isEv = category === 'electric'
  if (co2GPerMile == null && !isEv) return null

  return {
    id: `${SOURCE}:${id}`,
    source: SOURCE,
    cycle: CYCLE,
    make,
    model,
    makeKey: mk,
    modelKey: mdk,
    modelYear: year,
    fuelType,
    fuelCategory: category,
    powertrain: epaPowertrain(rec.atvType),
    engineCc: displ ? Math.round(displ * 1000) : null,
    cylinders: num(rec.cylinders),
    l100km: !isEv && category !== 'hydrogen' && mpg ? Math.round((MPG_TO_L_100KM / mpg) * 10) / 10 : null,
    co2GKm: isEv ? 0 : Math.round(gramsPerMileToGramsPerKm(co2GPerMile!)),
    evKwh100km: kwhPer100mi ? Math.round((kwhPer100mi / KM_PER_MILE) * 10) / 10 : null
  }
}
