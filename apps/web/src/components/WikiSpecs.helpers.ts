import {
  GEARBOX_WORD,
  resolveFuelCategories,
  type VehicleFuel,
  type WikiDimensions,
  type WikiEngineView,
  isCuratedSource,
  type WikiSource
} from '@carplates/shared'

import { ccToLitres, cmToMetres, kgToTonnes, kwToHp } from '@/components/RdwSpecs.helpers'

type Translate = (key: string, options?: Record<string, unknown>) => string

/** "Wikipedia (RU)"; the Ukrainian edition's subdomain is `uk`, shown as the app's `UA`. A curated source is the cited site's own name. */
export function wikiSourceLabel(source: Pick<WikiSource, 'lang' | 'title'>): string {
  if (isCuratedSource(source) && source.title) return source.title
  const lang = source.lang === 'uk' ? 'ua' : source.lang
  return `Wikipedia (${lang.toUpperCase()})`
}

/** "74 kW (101 hp)", or "74–92 kW (101–125 hp)" for a range; null without a power figure. */
export function formatEnginePower(e: Pick<WikiEngineView, 'powerKw' | 'powerKwMax'>, t: Translate): string | null {
  if (e.powerKw == null) return null
  const high = e.powerKwMax != null && e.powerKwMax > e.powerKw ? e.powerKwMax : null
  const kw = high ? `${Math.round(e.powerKw)}–${Math.round(high)}` : String(Math.round(e.powerKw))
  const hp = high ? `${kwToHp(e.powerKw)}–${kwToHp(high)}` : String(kwToHp(e.powerKw))
  return `${kw} ${t('rdw.unitKw')} (${hp} ${t('rdw.unitHp')})`
}

/** "1.3 L petrol · 74 kW (101 hp)"; a row whose numbers were unreadable falls back to its own text. */
export function formatEngine(e: WikiEngineView, t: Translate): string {
  const parts = [
    e.displacementCc ? `${ccToLitres(e.displacementCc)} ${t('field.unitL')}` : null,
    e.fuel ? t(`wikispec.fuel.${e.fuel}`, { defaultValue: e.fuel }) : null,
    formatEnginePower(e, t)
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : (e.raw ?? '')
}

/** Engine families whose code has the chassis shape (1-4 letters, 1-3 digits). */
const ENGINE_FAMILY =
  /^(B(38|47|48|58)|TU\d|XUD?\d{1,2}|DV\d{1,2}|DW\d{1,2}|EP\d|HR\d{2}|EA\d{3}|VR\d|I\d|TD\d{2}|M\d{3})$/

/**
 * Splits a row's codes into engine codes (`T24A-FTS`, `2TR-FE`, `L13Z4`) and chassis / model codes (`TJA250`, `FK1`). A chassis
 * code is 1-4 letters then 1-3 digits and no hyphen, unless it is a well-known engine family (`B48`, `TU5`, `EA888`); a bare
 * number is a displacement the source table put in the code column and is dropped. A best guess for rows whose header did not
 * name the column (old rows, ambiguous "Code" headers); `wikiRowCodes` prefers the stored split.
 */
export function splitWikiCodes(codes: readonly string[] | null | undefined): { engine: string[]; chassis: string[] } {
  const out: { engine: string[]; chassis: string[] } = { engine: [], chassis: [] }
  for (const code of codes ?? []) {
    if (/^\d+$/.test(code) || GEARBOX_WORD.test(code)) continue
    out[/^[A-Z]{1,4}\d{1,3}$/.test(code) && !ENGINE_FAMILY.test(code) ? 'chassis' : 'engine'].push(code)
  }
  return out
}

/** The stored engine / chassis split when the source header named the column (`engineCodes` present), else the shape guess. */
export function wikiRowCodes(e: Pick<WikiEngineView, 'chassisCodes' | 'engineCodes'>): {
  engine: string[]
  chassis: string[]
} {
  if (e.engineCodes == null) return splitWikiCodes(e.chassisCodes)
  return { engine: e.engineCodes, chassis: e.chassisCodes ?? [] }
}

/** What the registry says about this car, for comparing it with the generation's catalogue figures. */
export type OwnCar = {
  fuel?: string | null
  displacementCc?: number | null
  powerKw?: number | null
  massKg?: number | null
  year?: number | null
}

/** Registry displacement is exact, Wikipedia's is the marketing figure (a "2.0" is 1,998 cm³): allow 3 %. */
const DISPLACEMENT_TOLERANCE = 0.03
/** Registry power is rounded and sometimes the market variant's: allow 7 % around the catalogue range. */
const POWER_TOLERANCE = 0.07

/** True / false when the engine's fuel can / cannot be this car's; null when either side does not say. */
function fuelFits(engineFuel: string | null | undefined, carFuel: string | null | undefined): boolean | null {
  const categories = resolveFuelCategories(carFuel)
  if (!engineFuel || categories.length === 0) return null
  const hasCombustion = categories.includes('petrol') || categories.includes('diesel')
  if (engineFuel === 'hybrid') return categories.includes('electric') || hasCombustion
  if (engineFuel === 'lpg') return categories.includes('gas')
  return categories.includes(engineFuel as VehicleFuel)
}

/**
 * Whether this engine row is the one the registry describes: fuel (when both name it), displacement within 3 % and power
 * inside the catalogue range ±7 %. Needs displacement or power on both sides, so an engine is never "matched" on fuel alone.
 */
export function engineMatchesCar(e: WikiEngineView, own: OwnCar | undefined): boolean {
  if (!own) return false
  if (fuelFits(e.fuel, own.fuel) === false) return false
  const cc = own.displacementCc && own.displacementCc > 0 ? own.displacementCc : null
  const kw = own.powerKw && own.powerKw > 0 ? own.powerKw : null
  const ccKnown = !!(cc && e.displacementCc)
  const kwKnown = !!(kw && e.powerKw != null)
  if (!ccKnown && !kwKnown) return false
  if (ccKnown && Math.abs(e.displacementCc! - cc!) / cc! > DISPLACEMENT_TOLERANCE) return false
  if (kwKnown) {
    const low = e.powerKw! * (1 - POWER_TOLERANCE)
    const high = (e.powerKwMax ?? e.powerKw!) * (1 + POWER_TOLERANCE)
    if (kw! < low || kw! > high) return false
  }
  return true
}

const signed = (n: number, text: string): string => `${n > 0 ? '+' : '−'}${text}`

/** "+0.4 L · +33 kW": how an engine that is not this car's differs from it; null when nothing is comparable. */
export function engineVsCar(e: WikiEngineView, own: OwnCar | undefined, t: Translate): string | null {
  if (!own) return null
  const parts: string[] = []
  const cc = own.displacementCc
  if (cc && cc > 0 && e.displacementCc) {
    const diff = Number(((e.displacementCc - cc) / 1000).toFixed(1))
    if (diff !== 0) parts.push(`${signed(diff, String(Math.abs(diff)))} ${t('field.unitL')}`)
  }
  const kw = own.powerKw
  if (kw && kw > 0 && e.powerKw != null) {
    const diff = Math.round(e.powerKw - kw)
    if (diff !== 0) parts.push(`${signed(diff, String(Math.abs(diff)))} ${t('rdw.unitKw')}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

/** Engines with the one(s) matching this car first; the source order is kept inside both groups. */
export function sortEnginesByFit<T extends WikiEngineView>(engines: readonly T[], own: OwnCar | undefined): T[] {
  const fits = engines.filter(e => engineMatchesCar(e, own))
  return [...fits, ...engines.filter(e => !fits.includes(e))]
}

/** Which year of the generation the car is (1-based) and how many years it ran; total is null while in production. */
export function generationYearOf(
  year: number | null | undefined,
  yearFrom: number,
  yearTo: number | null | undefined
): { n: number; total: number | null } | null {
  if (!year || year < yearFrom || (yearTo != null && year > yearTo)) return null
  return { n: year - yearFrom + 1, total: yearTo != null ? yearTo - yearFrom + 1 : null }
}

/** "1,210 kg": the car's registered own mass, shown beside the catalogue kerb mass; null when the registry has none. */
export function carMass(own: OwnCar | undefined, t: Translate, locale: string): string | null {
  if (!own?.massKg || own.massKg <= 0) return null
  return `${new Intl.NumberFormat(locale).format(own.massKg)} ${t('field.unitKg')}`
}

export const ENGINE_ROW_KEYS = [
  'power',
  'displacement',
  'fuel',
  'cylinders',
  'engineCode',
  'chassisCode',
  'note',
  'years',
  'raw'
] as const
export type EngineRowKey = (typeof ENGINE_ROW_KEYS)[number]

/** The key / value rows of one engine; a row without a value is dropped, and `raw` shows only when no number was read. */
export function engineRows(e: WikiEngineView, t: Translate): { key: EngineRowKey; value: string }[] {
  const codes = wikiRowCodes(e)
  const hasNumbers = e.powerKw != null || !!e.displacementCc
  const values: Record<EngineRowKey, string | null> = {
    power: formatEnginePower(e, t),
    displacement: e.displacementCc ? `${ccToLitres(e.displacementCc)} ${t('field.unitL')}` : null,
    fuel: e.fuel ? t(`wikispec.fuel.${e.fuel}`, { defaultValue: e.fuel }) : null,
    cylinders: e.cylinders ? String(e.cylinders) : null,
    engineCode: codes.engine.join(', ') || null,
    chassisCode: codes.chassis.join(', ') || null,
    note: e.note || null,
    years: e.years || null,
    raw: hasNumbers ? null : e.raw || null
  }
  return ENGINE_ROW_KEYS.flatMap(key => (values[key] ? [{ key, value: values[key] }] : []))
}

export const DIMENSION_KEYS = ['wheelbaseMm', 'lengthMm', 'widthMm', 'heightMm', 'kerbKg', 'fuelTankL'] as const
export type DimensionKey = (typeof DIMENSION_KEYS)[number]

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  wheelbaseMm: 'rdw.wheelbase',
  lengthMm: 'rdw.length',
  widthMm: 'rdw.width',
  heightMm: 'rdw.height',
  kerbKg: 'rdw.kerbMass',
  fuelTankL: 'wikispec.fuelTank'
}

/** "2,700 mm (~2.7 m)", "1,240 kg (~1.24 t)", "50 L"; null when the figure is absent. */
export function formatDimension(key: DimensionKey, dims: WikiDimensions, t: Translate, locale: string): string | null {
  const value = dims[key]
  if (value == null) return null
  const n = new Intl.NumberFormat(locale).format(value)
  if (key === 'kerbKg') return `${n} ${t('field.unitKg')} (~${kgToTonnes(value)} ${t('field.unitT')})`
  if (key === 'fuelTankL') return `${n} ${t('field.unitL')}`
  return `${n} ${t('wikispec.unitMm')} (~${cmToMetres(value / 10)} ${t('rdw.unitM')})`
}

/** True when at least one dimension / mass / tank figure is present. */
export function hasDimensions(dims: WikiDimensions | null | undefined): boolean {
  return !!dims && DIMENSION_KEYS.some(k => dims[k] != null)
}
