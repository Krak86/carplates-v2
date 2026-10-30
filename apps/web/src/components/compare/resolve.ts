import { fuelKeyword, resolveFuelCategories } from '@carplates/shared'
import type { CatalogModel, PlateLookupResponse, Registration, VehicleFuel, VinDecodeResponse } from '@carplates/shared'

import type { CompareCar, CompareRef, ExactFacts } from './types'

type PlateRef = Extract<CompareRef, { kind: 'plate' }>
type VinRef = Extract<CompareRef, { kind: 'vin' }>
type ModelRef = Extract<CompareRef, { kind: 'model' }>

/** ISO date text of the registry (`2019-05-14`) to its year. */
const yearOf = (date: string | null | undefined): number | null => {
  const year = Number(date?.slice(0, 4))
  return Number.isInteger(year) && year > 1900 ? year : null
}

/** The model-level inputs of a registry row. Never reads `person`. */
function fromRegistration(ref: CompareRef, c: Registration, exact: Partial<ExactFacts>): CompareCar {
  return {
    ref,
    brand: c.brand,
    model: c.model,
    year: c.makeYear,
    kind: c.kind,
    fuel: c.fuel,
    capacity: c.capacity,
    powerKw: c.powerKwt,
    body: c.body,
    ownWeight: c.ownWeight,
    totalWeight: c.totalWeight,
    exact: {
      plate: c.plate,
      vin: c.vin,
      year: c.makeYear,
      color: c.color,
      region: null,
      registeredYear: yearOf(c.dReg),
      ownersCount: null,
      historyCount: null,
      operName: c.operName,
      everImported: null,
      capacity: c.capacity,
      powerKw: c.powerKwt,
      ownWeight: c.ownWeight,
      totalWeight: c.totalWeight,
      ...exact
    }
  }
}

/** A plate lookup: the registry row of the car plus the counts the lookup carries. */
export function carFromPlate(ref: PlateRef, data: PlateLookupResponse): CompareCar {
  return fromRegistration(ref, data.current, {
    plate: data.plate,
    region: data.region,
    ownersCount: data.ownersCount,
    historyCount: data.historyCount,
    everImported: data.everImported ?? null
  })
}

/** NHTSA's fuel words to the registry keyword the fuel helpers read (`ДИЗЕЛЬНЕ`); null when it names no known fuel. */
export function nhtsaFuelKeyword(text: string | null | undefined): string | null {
  const t = (text ?? '').toLowerCase()
  const category: VehicleFuel | null = t.includes('electric')
    ? 'electric'
    : t.includes('diesel')
      ? 'diesel'
      : t.includes('gasoline') || t.includes('petrol')
        ? 'petrol'
        : t.includes('hydrogen')
          ? 'hydrogen'
          : t.includes('natural gas') || t.includes('propane') || t.includes('lpg')
            ? 'gas'
            : null
  return category ? fuelKeyword(category) : null
}

const positiveInt = (text: string | undefined): number | null => {
  const n = Math.round(Number(text))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** A VIN: our own registry row when the VIN is in it, else what the NHTSA decode says (make, model, year, fuel, engine, body). */
export function carFromVin(ref: VinRef, data: VinDecodeResponse): CompareCar {
  const latest = data.registry?.actions[0]
  if (latest) {
    return fromRegistration(ref, latest, {
      vin: data.vin,
      plate: data.registry?.plate ?? latest.plate,
      historyCount: data.registry?.actions.length ?? null
    })
  }

  const fields = new Map(data.results.map(r => [r.variable, r.value]))
  const litres = Number(fields.get('Displacement (L)'))
  const capacity = positiveInt(fields.get('Displacement (CC)')) ?? (litres > 0 ? Math.round(litres * 1000) : null)
  const year = positiveInt(fields.get('Model Year'))
  return {
    ref,
    brand: fields.get('Make') ?? null,
    model: fields.get('Model') ?? null,
    year,
    kind: null,
    fuel: nhtsaFuelKeyword(fields.get('Fuel Type - Primary')),
    capacity,
    powerKw: positiveInt(fields.get('Engine Power (kW)')),
    body: null,
    ownWeight: null,
    totalWeight: null,
    exact: {
      plate: null,
      vin: data.vin,
      year,
      color: null,
      region: null,
      registeredYear: null,
      ownersCount: null,
      historyCount: null,
      operName: null,
      everImported: null,
      capacity,
      powerKw: positiveInt(fields.get('Engine Power (kW)')),
      ownWeight: null,
      totalWeight: null
    }
  }
}

/** The registry fuel word of the model's cars that belongs to a fuel class, the biggest first; null when none does. */
export function fuelWordOf(model: CatalogModel, fuel: VehicleFuel | null): string | null {
  const rows = model.stats.fuel
  if (!fuel) return rows[0]?.[0] ?? null
  return rows.find(([word]) => resolveFuelCategories(word).includes(fuel))?.[0] ?? null
}

/**
 * A catalog model at a year and fuel class: the typical car of that model. The engine size and power medians describe the
 * dominant fuel only, so they are dropped for another one (as `ModelVariants` does). No registry facts of one car.
 */
export function carFromModel(ref: ModelRef, model: CatalogModel): CompareCar {
  const dominant = model.stats.fuel[0]?.[0] ?? null
  const fuel = fuelWordOf(model, ref.fuel) ?? (ref.fuel ? fuelKeyword(ref.fuel) : dominant)
  const typical = fuel === dominant
  return {
    ref,
    brand: model.topBrand,
    model: model.topModel,
    year: ref.year,
    kind: model.kind,
    fuel,
    capacity: typical ? (model.stats.capacityP50 ?? null) : null,
    powerKw: typical ? (model.stats.powerP50 ?? null) : null,
    body: model.stats.body[0]?.[0] ?? null,
    ownWeight: null,
    totalWeight: null,
    exact: null
  }
}

/** "BMW 3 Series 2015" style name of a car for headers. */
export const carTitle = (car: Pick<CompareCar, 'brand' | 'model'>): string =>
  [car.brand, car.model].filter(Boolean).join(' ')
