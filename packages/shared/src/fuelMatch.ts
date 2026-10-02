import { resolveFuelCategories } from './vehicleFuel.js'
import type { FuelEconomyEstimate } from './schemas.js'

/** The reference-row fields matching needs — structurally satisfied by `registry.fuel_economy` rows. */
export type FuelReferenceRow = {
  source: string
  cycle: string
  modelKey: string
  modelYear: number
  powertrain: string
  engineCc: number | null
  l100km: number | null
  co2GKm: number | null
  evKwh100km: number | null
}

/** Reference rows further than this many model years from the car are not "similar". */
export const MAX_YEAR_GAP = 3
/** An engine within this fraction of the registered capacity counts as the same engine. */
export const CAPACITY_TOLERANCE = 0.12
/** Preferred source when several match equally well: EU (WLTP, closer to the Ukrainian fleet) before US (EPA). */
export const SOURCE_PRIORITY = ['eea', 'epa'] as const

export type FuelCriteria = { year: number; fuel?: string | null; capacity?: number | null }

/** The registry says "ЕЛЕКТРО АБО БЕНЗИН" for a hybrid, so electric + a combustion fuel means an electrified powertrain. */
function wantedPowertrains(categories: readonly string[]): string[] | null {
  if (categories.length === 0) return null
  const electric = categories.includes('electric')
  const combustion = categories.some(c => c !== 'electric')
  if (electric && combustion) return ['hybrid', 'phev']
  if (electric) return ['ev']
  return ['ice']
}

/** Prefers rows of the wanted kind; when the source has none of that kind, falls back to everything it has. */
function preferred<T>(rows: readonly T[], keep: (row: T) => boolean): T[] {
  const kept = rows.filter(keep)
  return kept.length > 0 ? kept : [...rows]
}

function closestYearRows<T extends FuelReferenceRow>(rows: readonly T[], year: number): T[] {
  if (rows.length === 0) return []
  const gap = (r: T): number => Math.abs(r.modelYear - year)
  const best = Math.min(...rows.map(gap))
  if (best > MAX_YEAR_GAP) return []
  // On a tie between year-1 and year+1, the later model year wins (US model years run about a year ahead).
  const bestRows = rows.filter(r => gap(r) === best)
  const latest = Math.max(...bestRows.map(r => r.modelYear))
  return bestRows.filter(r => r.modelYear === latest)
}

function summarize(source: string, rows: readonly FuelReferenceRow[]): FuelEconomyEstimate {
  const co2 = rows.map(r => r.co2GKm).filter((v): v is number => v != null)
  const l100 = rows.map(r => r.l100km).filter((v): v is number => v != null)
  const kwh = rows.map(r => r.evKwh100km).filter((v): v is number => v != null)
  return {
    source,
    cycle: rows[0]!.cycle,
    modelYear: rows[0]!.modelYear,
    matches: rows.length,
    co2GKmMin: Math.min(...co2),
    co2GKmMax: Math.max(...co2),
    l100kmMin: l100.length > 0 ? Math.min(...l100) : null,
    l100kmMax: l100.length > 0 ? Math.max(...l100) : null,
    evKwh100km: kwh.length > 0 ? Math.min(...kwh) : null
  }
}

/**
 * Reference models extend the registry's ("Camry" → "Camry Hybrid LE"), so first take reference keys that START
 * WITH the registry's model key. Failing that, the registry's key may be the longer one ("LAND CRUISER 200" vs
 * "landcruiser") — then the longest reference key that is a prefix of it. Input rows must already be one make.
 */
export function matchModelRows<T extends FuelReferenceRow>(makeRows: readonly T[], mdl: string): T[] {
  const forward = makeRows.filter(r => r.modelKey.startsWith(mdl))
  if (forward.length > 0) return forward
  const reverse = makeRows.filter(r => r.modelKey.length >= 2 && mdl.startsWith(r.modelKey))
  if (reverse.length === 0) return reverse
  const longest = Math.max(...reverse.map(r => r.modelKey.length))
  return reverse.filter(r => r.modelKey.length === longest)
}

/**
 * Narrows candidate reference rows (already matched on make + model) to "similar vehicles" per source, then picks
 * one source — never mixing sources/cycles in one estimate. Exact model year beats a nearby one; ties go by
 * `SOURCE_PRIORITY`. Null when nothing is similar enough.
 */
export function selectFuelEstimate(
  rows: readonly FuelReferenceRow[],
  criteria: FuelCriteria
): FuelEconomyEstimate | null {
  const wanted = wantedPowertrains(resolveFuelCategories(criteria.fuel))
  const capacity = criteria.capacity && criteria.capacity > 0 ? criteria.capacity : null

  const candidates: { source: string; rows: FuelReferenceRow[] }[] = []
  for (const source of new Set(rows.map(r => r.source))) {
    let bySource = closestYearRows(
      rows.filter(r => r.source === source && r.co2GKm != null),
      criteria.year
    )
    if (bySource.length === 0) continue
    if (wanted) bySource = preferred(bySource, r => wanted.includes(r.powertrain))
    if (capacity) {
      bySource = preferred(
        bySource,
        r => r.engineCc != null && Math.abs(r.engineCc - capacity) / capacity <= CAPACITY_TOLERANCE
      )
    }
    candidates.push({ source, rows: bySource })
  }
  if (candidates.length === 0) return null

  const rank = (source: string): number => {
    const i = SOURCE_PRIORITY.findIndex(s => s === source)
    return i === -1 ? SOURCE_PRIORITY.length : i
  }
  const yearGap = (c: { rows: FuelReferenceRow[] }): number => Math.abs(c.rows[0]!.modelYear - criteria.year)
  candidates.sort((a, b) => yearGap(a) - yearGap(b) || rank(a.source) - rank(b.source))
  const best = candidates[0]!
  return summarize(best.source, best.rows)
}

export const FUEL_CLASSES = ['electric', 'hybrid', 'petrol', 'diesel', 'gas', 'hydrogen', 'unknown'] as const
export type FuelClass = (typeof FUEL_CLASSES)[number]

/**
 * One bucket per registry `fuel` text, for statistics: electric + any combustion fuel is a "hybrid" (same rule as
 * `wantedPowertrains`), otherwise the first listed fuel wins ("БЕНЗИН АБО ГАЗ" → petrol — the car runs on petrol and
 * has LPG fitted).
 */
export function registryFuelClass(fuel: string | null | undefined): FuelClass {
  const categories = resolveFuelCategories(fuel)
  if (categories.length === 0) return 'unknown'
  if (categories.includes('electric') && categories.length > 1) return 'hybrid'
  return categories[0] ?? 'unknown'
}
