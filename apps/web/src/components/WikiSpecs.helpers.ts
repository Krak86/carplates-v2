import type { WikiDimensions, WikiEngineView, WikiSource } from '@carplates/shared'

import { ccToLitres, cmToMetres, kgToTonnes, kwToHp } from '@/components/RdwSpecs.helpers'

type Translate = (key: string, options?: Record<string, unknown>) => string

/** "Wikipedia (RU)"; the Ukrainian edition's subdomain is `uk`, shown as the app's `UA`. */
export function wikiSourceLabel(source: Pick<WikiSource, 'lang'>): string {
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

/**
 * Splits a row's codes into engine codes (`T24A-FTS`, `2TR-FE`, `L13Z4`) and chassis / model codes (`TJA250`, `FK1`). A chassis
 * code is 1-4 letters then 1-3 digits and no hyphen; this is a best guess, the source table does not label the two.
 */
export function splitWikiCodes(codes: readonly string[] | null | undefined): { engine: string[]; chassis: string[] } {
  const out: { engine: string[]; chassis: string[] } = { engine: [], chassis: [] }
  for (const code of codes ?? []) {
    out[/^[A-Z]{1,4}\d{1,3}$/.test(code) ? 'chassis' : 'engine'].push(code)
  }
  return out
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
  const codes = splitWikiCodes(e.chassisCodes)
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
