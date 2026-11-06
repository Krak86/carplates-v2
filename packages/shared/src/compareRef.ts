import { catalogSlugSchema } from './catalog.js'
import { classifyQuery, denormalizePlate, normalizePlate } from './plate.js'
import { VEHICLE_FUELS, type VehicleFuel } from './vehicleFuel.js'

/** What one compare slot was given: a plate, a VIN, or a catalog model (slugs, year, optional fuel class). */
export type CompareRef =
  | { kind: 'plate'; plate: string }
  | { kind: 'vin'; vin: string }
  | { kind: 'model'; make: string; model: string; year: number; fuel: VehicleFuel | null }

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

/**
 * The URL value of a ref (the inverse of `parseCompareRef`). A plate is written in Latin letters: the canonical Cyrillic
 * one would be percent-escaped into a long, unreadable link (`%D0%92...`) in chats; parsing normalizes it back.
 */
export function formatCompareRef(ref: CompareRef): string {
  if (ref.kind === 'plate') return `plate:${denormalizePlate(ref.plate)}`
  if (ref.kind === 'vin') return `vin:${ref.vin}`
  return `m:${ref.make}/${ref.model}/${ref.year}${ref.fuel ? `/${ref.fuel}` : ''}`
}
