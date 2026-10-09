/**
 * Stage C4 — rough value estimate from the Dutch new price (`catalogusprijs`, RDW) and an assumed depreciation curve.
 *
 * Curve source: the Dutch BPM forfaitaire afschrijvingstabel (Belastingdienst, "Afschrijving met koerslijst, taxatierapport
 * of forfaitaire tabel", https://www.belastingdienst.nl/wps/wcm/connect/nl/bpm/content/bpm-afschrijving-koerslijst-taxatierapport-forfaitaire-tabel,
 * read 2026-10-09). It is an official tax schedule for used imports, revised in 2023 to follow real value loss — not market
 * prices. Cross-check: after 3 years it leaves 46 % of the new price, Autovista reports 47-59 % across Western Europe
 * (October 2024, 60,000 km). The estimate is never a Ukrainian price.
 */

/** One band of the table: from `fromMonths` the depreciation is `base` % plus `perMonth` % for each started month. */
type Band = { fromMonths: number; base: number; perMonth: number }

const BANDS: readonly Band[] = [
  { fromMonths: 0, base: 0, perMonth: 12 },
  { fromMonths: 1, base: 12, perMonth: 4 },
  { fromMonths: 3, base: 20, perMonth: 3.5 },
  { fromMonths: 5, base: 27, perMonth: 1.5 },
  { fromMonths: 9, base: 33, perMonth: 1 },
  { fromMonths: 18, base: 42, perMonth: 0.75 },
  { fromMonths: 30, base: 51, perMonth: 0.5 },
  { fromMonths: 42, base: 57, perMonth: 0.42 },
  { fromMonths: 54, base: 62, perMonth: 0.42 },
  { fromMonths: 66, base: 67, perMonth: 0.42 },
  { fromMonths: 78, base: 72, perMonth: 0.25 },
  { fromMonths: 90, base: 75, perMonth: 0.25 },
  { fromMonths: 102, base: 78, perMonth: 0.25 },
  { fromMonths: 114, base: 81, perMonth: 0.19 }
]

/**
 * Half-width of the shown range around the point estimate: the table is a tax schedule, and mileage / condition vary —
 * more for an old car, where one example can be a wreck or a collector's piece. OUR choice: 15 % up to 10 years, growing
 * in a straight line to 35 % at 20 years and beyond.
 */
export const VALUE_RANGE_SPREAD = 0.15
export const VALUE_RANGE_SPREAD_OLD = 0.35
const SPREAD_GROWS_FROM_YEARS = 10
const SPREAD_FULL_AT_YEARS = 20

/** Range half-width (0-1) for a car of `ageYears`. */
export function rangeSpread(ageYears: number): number {
  if (!(ageYears > SPREAD_GROWS_FROM_YEARS)) return VALUE_RANGE_SPREAD
  const t = Math.min(1, (ageYears - SPREAD_GROWS_FROM_YEARS) / (SPREAD_FULL_AT_YEARS - SPREAD_GROWS_FROM_YEARS))
  return Math.round((VALUE_RANGE_SPREAD + t * (VALUE_RANGE_SPREAD_OLD - VALUE_RANGE_SPREAD)) * 100) / 100
}

/** Estimates below this many euros are not worth showing (they would round to a meaningless range). */
const MIN_ESTIMATE_EUR = 100

/**
 * Past the end of the table (about 17 years) the estimate holds at this share of the new price instead of vanishing —
 * OUR assumption, not part of the source (no open citable curve exists for old cars); the UI flags it as very rough.
 */
export const OLD_CAR_FLOOR_SHARE = 0.05

/**
 * Share (0-1) of the new price a car of whole `ageYears` still has; null when the table has depreciated it fully (about
 * 17 years and up) or the age is not a sensible number. `estimateValue` swaps in a floor for the first case.
 */
export function retainedShare(ageYears: number): number | null {
  if (!Number.isFinite(ageYears) || ageYears < 0) return null
  const months = Math.round(ageYears * 12)
  const band = BANDS.findLast(b => months >= b.fromMonths)
  if (!band) return null
  const started = band.fromMonths === 0 ? months : months - band.fromMonths
  const depreciation = band.base + band.perMonth * started
  return depreciation >= 100 ? null : (100 - depreciation) / 100
}

/** First whole age (years) at which the table has depreciated the car fully and the old-car floor takes over. */
export function floorStartYears(): number {
  let age = 0
  while (retainedShare(age) != null) age++
  return age
}

export type ValueEstimate = {
  ageYears: number
  /** Share (0-1) of the new price left. */
  retained: number
  /** True when the age is past the table and `OLD_CAR_FLOOR_SHARE` was used. */
  extrapolated: boolean
  /** Half-width (0-1) of the range, see `rangeSpread`. */
  spread: number
  /** Point estimate and the range around it, euros rounded to 100. */
  midEur: number
  lowEur: number
  highEur: number
}

const round100 = (eur: number): number => Math.round(eur / 100) * 100

/** New price (euros) x curve(age) as a rounded range; null when the curve has no value or the result is negligible. */
export function estimateValue(newPriceEur: number | null | undefined, ageYears: number): ValueEstimate | null {
  if (newPriceEur == null || !(newPriceEur > 0)) return null
  if (!Number.isFinite(ageYears) || ageYears < 0) return null
  const tabled = retainedShare(ageYears)
  const retained = tabled ?? OLD_CAR_FLOOR_SHARE
  const mid = newPriceEur * retained
  if (mid < MIN_ESTIMATE_EUR) return null
  const spread = rangeSpread(ageYears)
  return {
    ageYears,
    retained,
    extrapolated: tabled == null,
    midEur: round100(mid),
    spread,
    lowEur: round100(mid * (1 - spread)),
    highEur: round100(mid * (1 + spread))
  }
}

/** The curve as chart points for ages 0..`maxAgeYears`; past the table it continues at the old-car floor. */
export function valueCurve(newPriceEur: number, maxAgeYears: number): { ageYears: number; valueEur: number }[] {
  const points: { ageYears: number; valueEur: number }[] = []
  for (let age = 0; age <= maxAgeYears; age++) {
    const retained = retainedShare(age) ?? OLD_CAR_FLOOR_SHARE
    points.push({ ageYears: age, valueEur: round100(newPriceEur * retained) })
  }
  return points
}
