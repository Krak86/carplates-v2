import type { RdwSpecs } from '@carplates/shared'

export type SpecRange = NonNullable<RdwSpecs['powerKw']>

/** "4.28" metres for 428 cm — two decimals, trailing zeros dropped. */
export const cmToMetres = (cm: number): string => String(Number((cm / 100).toFixed(2)))

/** Metric horsepower per kW. */
const HP_PER_KW = 1.35962

export const kwToHp = (kw: number): number => Math.round(kw * HP_PER_KW)

/** "1.8" litres for 1798 cc — one decimal, like the basic section's capacity row. */
export const ccToLitres = (cc: number): string => (cc / 1000).toFixed(1)

/** "1.24" tonnes for 1240 kg — up to two decimals, trailing zeros dropped ("1.8", not "1.80"). */
export const kgToTonnes = (kg: number): string => String(Number((kg / 1000).toFixed(2)))

/** Ranges tighter than this share of the median read as one figure — a spread of 1 kg is not information. */
const NEGLIGIBLE_SPREAD = 0.02

const round = (v: number): number => Math.round(v)

export type SpecValue = {
  /** The median, rounded: "85". */
  main: string
  /** "66–110" when the vehicles genuinely differ, else null. */
  spread: string | null
}

/** Median plus min–max (only when they differ meaningfully). Locale-neutral: digits only, units are the caller's. */
export function describeRange(range: SpecRange): SpecValue {
  const main = round(range.median)
  const min = round(range.min)
  const max = round(range.max)
  const differs = max - min > Math.max(1, range.median * NEGLIGIBLE_SPREAD)
  return { main: String(main), spread: differs ? `${min}–${max}` : null }
}

/** What the registry itself says about this exact car, for the same measures (null = not recorded). */
export type OwnFigures = {
  powerKw: number | null
  displacementCc: number | null
  massKg: number | null
  grossMassKg: number | null
}

export type SpecRowDef = {
  /** Suffix of the `rdw.<key>` label and `rdw.about.<key>` explainer i18n keys. */
  key:
    | 'power'
    | 'displacement'
    | 'topSpeed'
    | 'mass'
    | 'grossMass'
    | 'towBraked'
    | 'towUnbraked'
    | 'seats'
    | 'doors'
    | 'length'
    | 'width'
    | 'height'
    | 'wheelbase'
    | 'co2'
  /** Offline-cached answers from before stage C2 lack the newer keys, hence the `?? null` in the picks. */
  pick: (specs: RdwSpecs) => SpecRange | null
  /** Unit i18n key; none for counts (seats, doors). */
  unitKey?: string
  /** The registry's own figure for this car, when it records one. */
  own?: (own: OwnFigures) => number | null
  /** Second unit shown in brackets after the value: horsepower, litres or tonnes. */
  alt?: 'hp' | 'l' | 't' | 'm'
}

/**
 * The rows of the Specs block, in order. Adding a measure (length, width, height, gross mass …) is one entry here, one
 * field in the `rdw` contract and the ingest, and its `rdw.<key>` + `rdw.about.<key>` i18n strings.
 */
export const SPEC_ROWS: readonly SpecRowDef[] = [
  { key: 'power', pick: s => s.powerKw, unitKey: 'rdw.unitKw', own: o => o.powerKw, alt: 'hp' },
  { key: 'displacement', pick: s => s.displacementCc, unitKey: 'rdw.unitCc', own: o => o.displacementCc, alt: 'l' },
  { key: 'topSpeed', pick: s => s.topSpeedKmh ?? null, unitKey: 'rdw.unitKmh' },
  { key: 'mass', pick: s => s.massKg, unitKey: 'field.unitKg', own: o => o.massKg, alt: 't' },
  { key: 'grossMass', pick: s => s.grossMassKg ?? null, unitKey: 'field.unitKg', own: o => o.grossMassKg, alt: 't' },
  { key: 'towBraked', pick: s => s.towBrakedKg ?? null, unitKey: 'field.unitKg', alt: 't' },
  { key: 'towUnbraked', pick: s => s.towUnbrakedKg ?? null, unitKey: 'field.unitKg', alt: 't' },
  { key: 'seats', pick: s => s.seats ?? null },
  { key: 'doors', pick: s => s.doors ?? null },
  { key: 'length', pick: s => s.lengthCm ?? null, unitKey: 'rdw.unitCm', alt: 'm' },
  { key: 'width', pick: s => s.widthCm ?? null, unitKey: 'rdw.unitCm', alt: 'm' },
  { key: 'height', pick: s => s.heightCm ?? null, unitKey: 'rdw.unitCm', alt: 'm' },
  { key: 'wheelbase', pick: s => s.wheelbaseCm ?? null, unitKey: 'rdw.unitCm', alt: 'm' },
  { key: 'co2', pick: s => s.co2GKm, unitKey: 'rdw.unitCo2' }
]

/** The bracketed second unit of a row: "136 hp", "~1.8 L", "~1.24 t", "~4.28 m". */
export function altFigure(alt: NonNullable<SpecRowDef['alt']>, value: number, t: (key: string) => string): string {
  if (alt === 'hp') return `${kwToHp(value)} ${t('rdw.unitHp')}`
  if (alt === 'l') return `~${ccToLitres(value)} ${t('field.unitL')}`
  if (alt === 'm') return `~${cmToMetres(value)} ${t('rdw.unitM')}`
  return `~${kgToTonnes(value)} ${t('field.unitT')}`
}

/**
 * "~520" for 516 vehicles, "~4,700" for 4738: two significant digits, because the register changes daily and a
 * snapshot count is only ever approximate. Under 10 the exact number is shown (a count of 6 is not "~6").
 */
export function approxCount(n: number, locale: string): string {
  if (n < 10) return String(n)
  const digits = Math.floor(Math.log10(n)) - 1
  const step = digits > 0 ? 10 ** digits : 1
  return `~${(Math.round(n / step) * step).toLocaleString(locale)}`
}
