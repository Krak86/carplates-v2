import {
  buildCustomsQuery,
  CUSTOMS_PRESETS,
  DEFAULT_IMPORT_FUEL,
  type CustomsQuery,
  type ImportFuel,
  type ImportInput
} from '@carplates/shared'

/** The form keeps what the user typed as text; `formToInput` turns it into numbers. */
export type FormState = {
  fuel: ImportFuel
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
    fuel: query.fuel ?? DEFAULT_IMPORT_FUEL,
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

/** Null until the customs value and the model year are usable; cc / kwh stay optional (the result says what is missing). */
export function formToInput(form: FormState, nowYear: number, eurUah: number): ImportInput | null {
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
