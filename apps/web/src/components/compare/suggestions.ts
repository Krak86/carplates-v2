import { resolveFuelCategories } from '@carplates/shared'
import type { VehicleFuel } from '@carplates/shared'

import type { CompareLoaded, CompareRef } from './types'

export type Suggestion =
  | { kind: 'otherFuel'; ref: CompareRef; fuel: VehicleFuel }
  | { kind: 'previousGeneration'; ref: CompareRef; generation: string }
  | { kind: 'sibling'; ref: CompareRef; name: string }

/** RDW fuel class -> our fuel word; plug-in and mild hybrids have no word of their own, so they are not offered. */
const RDW_FUEL: Readonly<Record<string, VehicleFuel>> = {
  petrol: 'petrol',
  diesel: 'diesel',
  ev: 'electric',
  gas: 'gas'
}

const MAX_SIBLINGS = 3

/**
 * What to put in slot B once slot A is a car: the same model on another fuel, the previous generation, and the
 * biggest other models of the make. Needs the car's catalog page (the refs carry its slugs); without one, nothing.
 */
export function buildSuggestions(a: CompareLoaded): Suggestion[] {
  const { car, catalog } = a
  if (!car?.year || !catalog) return []
  const model = (year: number, fuel: VehicleFuel | null): CompareRef => ({
    kind: 'model',
    make: catalog.make,
    model: catalog.model,
    year,
    fuel
  })
  const out: Suggestion[] = []

  const own = resolveFuelCategories(car.fuel ?? '')[0] ?? null
  for (const row of a.rdw?.priceByFuel ?? []) {
    const fuel = RDW_FUEL[row.fuel]
    if (fuel && fuel !== own) out.push({ kind: 'otherFuel', ref: model(car.year, fuel), fuel })
  }

  const previous = [...(a.generations ?? [])]
    .filter(g => g.yearTo !== null && g.yearTo < (car.year as number))
    .sort((x, y) => (y.yearTo ?? 0) - (x.yearTo ?? 0))[0]
  if (previous?.yearTo) {
    out.push({
      kind: 'previousGeneration',
      ref: model(previous.yearTo, own),
      generation: previous.code || previous.label
    })
  }

  for (const s of catalog.siblings.slice(0, MAX_SIBLINGS)) {
    out.push({
      kind: 'sibling',
      ref: { kind: 'model', make: catalog.make, model: s.model, year: car.year, fuel: null },
      name: `${catalog.makeName} ${s.modelName}`
    })
  }
  return out
}
