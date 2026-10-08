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

export type DescribeOptions = {
  /** Decimal places kept (consumption 5.8 l/100 km); default whole numbers. */
  decimals?: number
  /** Round to a multiple of this first (prices to 100 €) — false precision otherwise. */
  step?: number
  /** BCP-47 tag for digit grouping; none = plain digits. */
  locale?: string
}

export type SpecValue = {
  /** The median, rounded: "85". */
  main: string
  /** "66–110" when the vehicles genuinely differ, else null. */
  spread: string | null
}

/** Median plus min–max (only when they differ meaningfully). Locale-neutral: digits only, units are the caller's. */
export function describeRange(range: SpecRange, { decimals = 0, step, locale }: DescribeOptions = {}): SpecValue {
  const grain = step ?? 10 ** -decimals
  const snap = (v: number): number => Number((Math.round(v / grain) * grain).toFixed(decimals))
  const fmt = (v: number): string =>
    locale
      ? v.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : v.toFixed(decimals)
  const main = snap(range.median)
  const min = snap(range.min)
  const max = snap(range.max)
  const differs = max - min > Math.max(grain, range.median * NEGLIGIBLE_SPREAD)
  return { main: fmt(main), spread: differs ? `${fmt(min)}–${fmt(max)}` : null }
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
    | 'price'
    | 'priceExTax'
    | 'bpm'
    | 'kerbMass'
    | 'cylinders'
    | 'consumption'
    | 'evKwh'
    | 'evRange'
    | 'noise'
  /** Offline-cached answers from before stage C2 lack the newer keys, hence the `?? null` in the picks. */
  pick: (specs: RdwSpecs) => SpecRange | null
  /** Unit i18n key; none for counts (seats, doors). */
  unitKey?: string
  /** The registry's own figure for this car, when it records one. */
  own?: (own: OwnFigures) => number | null
  /** Second unit shown in brackets after the value: horsepower, litres or tonnes. */
  alt?: 'hp' | 'l' | 't' | 'm'
  /** Number formatting for the row; none = whole numbers. */
  format?: Omit<DescribeOptions, 'locale'> & { grouped?: boolean }
}

/**
 * The rows of the Specs block, in order. Adding a measure (length, width, height, gross mass …) is one entry here, one
 * field in the `rdw` contract and the ingest, and its `rdw.<key>` + `rdw.about.<key>` i18n strings.
 */
export const SPEC_ROWS: readonly SpecRowDef[] = [
  { key: 'power', pick: s => s.powerKw, unitKey: 'rdw.unitKw', own: o => o.powerKw, alt: 'hp' },
  { key: 'displacement', pick: s => s.displacementCc, unitKey: 'rdw.unitCc', own: o => o.displacementCc, alt: 'l' },
  { key: 'cylinders', pick: s => s.cylinders ?? null },
  { key: 'topSpeed', pick: s => s.topSpeedKmh ?? null, unitKey: 'rdw.unitKmh' },
  { key: 'consumption', pick: s => s.consumptionL100 ?? null, unitKey: 'rdw.unitL100', format: { decimals: 1 } },
  { key: 'evKwh', pick: s => s.evKwh100 ?? null, unitKey: 'rdw.unitKwh100', format: { decimals: 1 } },
  { key: 'evRange', pick: s => s.evRangeKm ?? null, unitKey: 'rdw.unitKm' },
  // Masses together: unladen, kerb, gross, then what it may tow.
  { key: 'mass', pick: s => s.massKg, unitKey: 'field.unitKg', own: o => o.massKg, alt: 't' },
  { key: 'kerbMass', pick: s => s.kerbMassKg ?? null, unitKey: 'field.unitKg', alt: 't' },
  { key: 'grossMass', pick: s => s.grossMassKg ?? null, unitKey: 'field.unitKg', own: o => o.grossMassKg, alt: 't' },
  { key: 'towBraked', pick: s => s.towBrakedKg ?? null, unitKey: 'field.unitKg', alt: 't' },
  { key: 'towUnbraked', pick: s => s.towUnbrakedKg ?? null, unitKey: 'field.unitKg', alt: 't' },
  { key: 'seats', pick: s => s.seats ?? null },
  { key: 'doors', pick: s => s.doors ?? null },
  { key: 'length', pick: s => s.lengthCm ?? null, unitKey: 'rdw.unitCm', alt: 'm' },
  { key: 'width', pick: s => s.widthCm ?? null, unitKey: 'rdw.unitCm', alt: 'm' },
  { key: 'height', pick: s => s.heightCm ?? null, unitKey: 'rdw.unitCm', alt: 'm' },
  { key: 'wheelbase', pick: s => s.wheelbaseCm ?? null, unitKey: 'rdw.unitCm', alt: 'm' },
  // The Dutch list price includes 21 % VAT and BPM — labelled as such, never shown as a Ukrainian price.
  { key: 'price', pick: s => s.priceEur ?? null, unitKey: 'rdw.unitEur', format: { step: 100, grouped: true } },
  {
    key: 'priceExTax',
    pick: s => s.priceExTaxEur ?? null,
    unitKey: 'rdw.unitEur',
    format: { step: 100, grouped: true }
  },
  { key: 'bpm', pick: s => s.bpmEur ?? null, unitKey: 'rdw.unitEur', format: { step: 10, grouped: true } },
  // Emissions last.
  { key: 'noise', pick: s => s.noiseDb ?? null, unitKey: 'rdw.unitDb' },
  { key: 'co2', pick: s => s.co2GKm, unitKey: 'rdw.unitCo2' }
]

/** One categorical measure of the Specs block: the shares of the vehicles per class, shown as small chips. */
export type ShareItem = { key: string; share: number }

export type ShareRowDef = {
  /** Suffix of the `rdw.<key>` label and `rdw.about.<key>` explainer i18n keys. */
  key: 'fuelMix' | 'bodyTypes' | 'colours' | 'energyLabels'
  pick: (specs: RdwSpecs) => readonly ShareItem[] | null
  /** Item labels are `rdw.<prefix>.<item key>`; none = the key is shown as it is (the label letters A-G). */
  itemPrefix?: 'fuel' | 'body' | 'colour'
  /** At most this many chips. */
  limit: number
}

/** Classes under this share are noise ("0.3 % gas"), not information. */
const MIN_SHARE = 0.02

export const SHARE_ROWS: readonly ShareRowDef[] = [
  { key: 'fuelMix', pick: s => s.fuelMix ?? null, itemPrefix: 'fuel', limit: 4 },
  { key: 'bodyTypes', pick: s => s.bodyTypes ?? null, itemPrefix: 'body', limit: 3 },
  { key: 'colours', pick: s => s.colours ?? null, itemPrefix: 'colour', limit: 3 },
  { key: 'energyLabels', pick: s => s.energyLabels ?? null, limit: 3 }
]

/** The chips worth showing, largest first; empty = hide the row. */
export const visibleShares = (items: readonly ShareItem[] | null, limit: number): ShareItem[] =>
  (items ?? []).filter(i => i.share >= MIN_SHARE).slice(0, limit)

/** "62%"; a share under half a percent never gets here (see `MIN_SHARE`), a recall share can: "<1%". */
export const formatPercent = (share: number): string =>
  share > 0 && share < 0.005 ? '<1%' : `${Math.round(share * 100)}%`

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
