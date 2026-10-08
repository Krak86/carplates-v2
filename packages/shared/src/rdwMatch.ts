import { MAX_YEAR_GAP } from './fuelMatch.js'
import { type ModelReferenceRow, type VdbMatch, type VdbVehicleClass, matchVdbModelAcrossMakes } from './vdbMatch.js'

/** Fewer vehicles than this per make/model/year is a registration quirk, not a spec — the ingest drops them. */
export const RDW_MIN_N = 3

/** One distinct RDW model (all years collapsed) — what the matcher runs over. `aliases` is always empty. */
export type RdwReferenceRow = ModelReferenceRow & { make: string; model: string }

/**
 * RDW vehicle kinds a registry vehicle class may match, most preferred first. RDW files vans under "Bedrijfsauto"
 * (kind `truck`), while the Ukrainian registry files vans as cars or as trucks depending on the importer.
 */
const KINDS_BY_CLASS: Readonly<Record<VdbVehicleClass, readonly string[]>> = {
  car: ['car', 'truck'],
  motorcycle: ['motorcycle'],
  truck: ['truck', 'car'],
  bus: ['bus', 'car']
}
export const rdwCatalogKinds = (cls: VdbVehicleClass): readonly string[] => KINDS_BY_CLASS[cls]

/**
 * The one matcher for RDW: the VehiclesDB rules (`matchVdbModelAcrossMakes` — exact key, curated aliases, BMW/Mercedes/
 * Mazda series keys, prefixes, cross-make homes) over RDW's own spellings. Null when nothing fits: hide, never guess.
 */
export function matchRdwModel<T extends RdwReferenceRow>(
  rows: readonly T[],
  mk: string,
  model: string,
  cls: VdbVehicleClass
): VdbMatch<T> | null {
  return matchVdbModelAcrossMakes(rows, mk, model, rdwCatalogKinds(cls))
}

/**
 * Below this many vehicles a make/model/year is a "small sample": still shown (more information beats less), but flagged
 * as approximate — a handful of cars (often grey imports with another homologation: a Mazda 6 2016 has 6 Dutch
 * registrations, 5 of them a US-spec 2.5) can say little about the model. Matching and year picking prefer well-sampled
 * candidates and only fall back to thin ones; the ingest keeps groups from `RDW_MIN_N`.
 */
export const RDW_MIN_DISPLAY_N = 10

/** True when the figures come from too few vehicles to be representative. */
export const isSmallRdwSample = (n: number): boolean => n < RDW_MIN_DISPLAY_N

/**
 * The row of the year closest to `year` within `MAX_YEAR_GAP`. A smaller gap wins; at equal gap a well-sampled year
 * beats a thin one (`RDW_MIN_DISPLAY_N`), then the later year. Null when no year is close.
 */
export function pickRdwYear<T extends { year: number; n: number }>(rows: readonly T[], year: number): T | null {
  const gap = (r: T): number => Math.abs(r.year - year)
  const close = rows.filter(r => gap(r) <= MAX_YEAR_GAP)
  return (
    close.sort(
      (a, b) => gap(a) - gap(b) || Number(isSmallRdwSample(a.n)) - Number(isSmallRdwSample(b.n)) || b.year - a.year
    )[0] ?? null
  )
}
