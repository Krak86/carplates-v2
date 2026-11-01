import {
  buildCustomsQuery,
  CUSTOMS_PRESETS,
  mapFuel,
  type CustomsQuery,
  type ImportFuel,
  type ImportInput
} from '@carplates/shared'

/** The form keeps what the user typed as text; `formToInput` turns it into numbers. */
export type FormState = {
  /** Empty until chosen: a link without a classifiable fuel (a hybrid, unknown text) leaves the choice to the user. */
  fuel: ImportFuel | ''
  value: string
  cc: string
  year: string
  kwh: string
  /** Duty rate override, percent. */
  duty: string
  eur1: boolean
}

const text = (n: number | undefined): string => (n == null ? '' : String(n))

/** Without any param the form shows the first (petrol) preset; with params only what the link carried. */
export function initialForm(query: CustomsQuery, hasParams: boolean): FormState {
  if (!hasParams) {
    const preset = CUSTOMS_PRESETS[0]
    return {
      fuel: preset.fuel,
      value: text(preset.value),
      cc: text(preset.cc),
      year: text(preset.year),
      kwh: '',
      duty: '',
      eur1: false
    }
  }
  return {
    fuel: query.fuel ?? '',
    value: text(query.value),
    cc: text(query.cc),
    year: text(query.year),
    kwh: text(query.kwh),
    duty: text(query.duty),
    eur1: !!query.eur1
  }
}

/** A positive finite number from user text (comma or dot decimals); null otherwise. */
export function parsePositive(raw: string): number | null {
  const n = Number(raw.trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Null until the fuel, the customs value and the model year are usable; cc / kwh stay optional (the result says what is missing). */
export function formToInput(form: FormState, nowYear: number, eurUah: number): ImportInput | null {
  if (form.fuel === '') return null
  const valueEur = parsePositive(form.value)
  const year = parsePositive(form.year)
  if (valueEur == null || year == null || year < 1900 || year > nowYear + 1) return null
  const duty = form.duty.trim() === '' ? null : Number(form.duty.trim().replace(',', '.'))
  return {
    fuel: form.fuel,
    valueEur,
    year: Math.trunc(year),
    cc: form.fuel === 'ev' ? null : parsePositive(form.cc),
    kwh: form.fuel === 'ev' ? parsePositive(form.kwh) : null,
    dutyRate: duty != null && Number.isFinite(duty) && duty >= 0 && duty <= 100 ? duty / 100 : null,
    eur1: form.eur1,
    nowYear,
    eurUah
  }
}

/** `/customs?...` link of a preset example. */
export function presetHref(preset: (typeof CUSTOMS_PRESETS)[number]): string {
  const { fuel, value, year } = preset
  const cc = 'cc' in preset ? preset.cc : undefined
  const kwh = 'kwh' in preset ? preset.kwh : undefined
  return `/customs?${buildCustomsQuery({ fuel, value, year, cc, kwh })}`
}

export type PrefillSpec = {
  /** Free fuel text of the source (lot, NHTSA); hybrids and unclassified text leave the fuel field empty. */
  fuelText?: string | null
  cc?: number | null
  year?: number | null
  /** Customs value guess in euros; omitted when unknown (the user types it). */
  valueEur?: number | null
}

/** `/customs?...` link for a car found elsewhere in the app (the VIN page); null without both the engine size and the year. */
export function customsPrefillHref({ fuelText, cc, year, valueEur }: PrefillSpec): string | null {
  if (!cc || cc <= 0 || !year) return null
  const fuel = mapFuel(fuelText)
  return `/customs?${buildCustomsQuery({
    fuel: fuel === 'hybrid' ? undefined : (fuel ?? undefined),
    cc,
    year,
    value: valueEur && valueEur > 0 ? valueEur : undefined
  })}`
}

export function formatEur(n: number, locale: string): string {
  return `€ ${n.toLocaleString(locale, { maximumFractionDigits: 2 })}`
}

export function formatUah(n: number, locale: string): string {
  return `₴ ${n.toLocaleString(locale, { maximumFractionDigits: 2 })}`
}

export const percent = (rate: number): string => `${Math.round(rate * 1000) / 10}%`

/** Primary texts the rules come from (also shown on the page). */
export const CUSTOMS_SOURCES = [
  { key: 'tax', url: 'https://zakon.rada.gov.ua/laws/show/2755-17#n3067' },
  { key: 'pension', url: 'https://zakon.rada.gov.ua/laws/show/400/97-%D0%B2%D1%80' },
  { key: 'budget', url: 'https://zakon.rada.gov.ua/laws/show/4695-20' },
  { key: 'tariff', url: 'https://zakon.rada.gov.ua/laws/show/2697-20' },
  { key: 'calculator', url: 'https://calc.customs.gov.ua/' }
] as const
