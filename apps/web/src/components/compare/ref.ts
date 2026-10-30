import { catalogSlugSchema, classifyQuery, normalizePlate, VEHICLE_FUELS } from '@carplates/shared'
import type { VehicleFuel } from '@carplates/shared'

import type { CompareRef } from './types'

const YEAR_MIN = 1900
const YEAR_MAX = 2100

const isFuel = (value: string): value is VehicleFuel => (VEHICLE_FUELS as readonly string[]).includes(value)

/**
 * One slot's URL value: `plate:AA1234BB`, `vin:<VIN>` or `m:make/model/year[/fuel]`. A bare value without a prefix is
 * read like the search box (VIN or plate). Anything malformed is null (the slot then shows its picker).
 */
export function parseCompareRef(raw: string | null | undefined): CompareRef | null {
  const text = raw?.trim()
  if (!text) return null

  const colon = text.indexOf(':')
  const prefix = colon > 0 ? text.slice(0, colon).toLowerCase() : ''
  const rest = colon > 0 ? text.slice(colon + 1) : text

  if (prefix === 'm') {
    const [make, model, yearText, fuelText, ...extra] = rest.split('/')
    const year = Number(yearText)
    if (extra.length > 0 || !Number.isInteger(year) || year < YEAR_MIN || year > YEAR_MAX) return null
    if (!catalogSlugSchema.safeParse(make).success || !catalogSlugSchema.safeParse(model).success) return null
    const fuel = fuelText?.toLowerCase() ?? ''
    if (fuel && !isFuel(fuel)) return null
    return {
      kind: 'model',
      make: make as string,
      model: model as string,
      year,
      fuel: fuel ? (fuel as VehicleFuel) : null
    }
  }

  const compact = rest.replace(/\s+/g, '')
  if (!compact || compact.length > 20) return null
  if (prefix === 'vin' || (prefix === '' && classifyQuery(compact) === 'vin')) {
    return classifyQuery(compact) === 'vin' ? { kind: 'vin', vin: compact.toUpperCase() } : null
  }
  if (prefix === 'plate' || prefix === '') return { kind: 'plate', plate: normalizePlate(compact) }
  return null
}

/** The URL value of a ref (the inverse of `parseCompareRef`). */
export function formatCompareRef(ref: CompareRef): string {
  if (ref.kind === 'plate') return `plate:${ref.plate}`
  if (ref.kind === 'vin') return `vin:${ref.vin}`
  return `m:${ref.make}/${ref.model}/${ref.year}${ref.fuel ? `/${ref.fuel}` : ''}`
}

/** `/compare?a=…&b=…`; an empty slot is left out. */
export function compareHref(a: CompareRef | null, b: CompareRef | null): string {
  const params = new URLSearchParams()
  if (a) params.set('a', formatCompareRef(a))
  if (b) params.set('b', formatCompareRef(b))
  // The separators stay readable (`?a=plate:AA1234BB&b=m:bmw/3series/2015/diesel`); both are legal in a query string.
  const query = params.toString().replace(/%3A/gi, ':').replace(/%2F/gi, '/')
  return query ? `/compare?${query}` : '/compare'
}

/** Same car (so a slot is not compared with itself). */
export const sameRef = (a: CompareRef | null, b: CompareRef | null): boolean =>
  !!a && !!b && formatCompareRef(a) === formatCompareRef(b)
