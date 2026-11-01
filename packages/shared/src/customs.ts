import { z } from 'zod'

/**
 * Import customs calculator (`/customs`): duty + excise + VAT + pension fee for a car imported to Ukraine.
 * Own contract file (not `schemas.ts`), so changing it does not discard saved offline data: new fields on
 * `customsRulesSchema` are `.nullable().optional()`.
 *
 * Primary sources, read on zakon.rada.gov.ua 2026-11-01:
 * - excise: Tax Code art. 215.3.5-1 (`Ставка = Ставка базова x К двигун x К вік`; EV 1 EUR per kWh of battery);
 * - pension fee: Law 400/97-VR art. 4 p. 8 (3 / 4 / 5 % at 165 / 290 subsistence minimums of 1 January);
 * - subsistence minimum 2026 (able-bodied): Budget Law 4695-IX art. 7, UAH 3,328.
 * Not read from the primary text (Customs Tariff page was not retrievable): 10 % duty, 0 % for EVs and with an
 * EUR.1 certificate. Hybrids are charged by their combustion engine and shown as an estimate.
 */

export const IMPORT_FUELS = ['petrol', 'diesel', 'hybrid', 'ev'] as const
export type ImportFuel = (typeof IMPORT_FUELS)[number]
export const DEFAULT_IMPORT_FUEL: ImportFuel = 'petrol'

const exciseBandSchema = z.object({
  /** EUR per 1000 cm3 up to and including `thresholdCc`. */
  baseEur: z.number(),
  /** EUR per 1000 cm3 above `thresholdCc`, applied to the whole volume. */
  aboveEur: z.number(),
  thresholdCc: z.number()
})

export const customsRulesSchema = z.object({
  version: z.string(),
  /** First and last day the rules apply, ISO (YYYY-MM-DD). */
  validFrom: z.string(),
  validTo: z.string(),
  dutyRate: z.number(),
  vatRate: z.number(),
  excise: z.object({
    petrol: exciseBandSchema,
    diesel: exciseBandSchema,
    evEurPerKwh: z.number(),
    ageMin: z.number(),
    ageMax: z.number()
  }),
  pension: z.object({
    subsistenceMinimumUah: z.number(),
    /** Share of the customs value, ascending: rate applies while the base is at most `upToMinimums` minimums. */
    tiers: z.array(z.object({ upToMinimums: z.number(), rate: z.number() })),
    topRate: z.number()
  })
})
export type CustomsRules = z.infer<typeof customsRulesSchema>

export const UA_IMPORT_2026_1: CustomsRules = {
  version: 'ua-import-2026.1',
  validFrom: '2026-01-01',
  validTo: '2026-12-31',
  dutyRate: 0.1,
  vatRate: 0.2,
  excise: {
    petrol: { baseEur: 50, aboveEur: 100, thresholdCc: 3000 },
    diesel: { baseEur: 75, aboveEur: 150, thresholdCc: 3500 },
    evEurPerKwh: 1,
    ageMin: 1,
    ageMax: 15
  },
  pension: {
    subsistenceMinimumUah: 3328,
    tiers: [
      { upToMinimums: 165, rate: 0.03 },
      { upToMinimums: 290, rate: 0.04 }
    ],
    topRate: 0.05
  }
}

export const CUSTOMS_RULES: readonly CustomsRules[] = [UA_IMPORT_2026_1]

/** The rules valid on `date` (ISO day), or null when none cover it (the caller says so instead of guessing). */
export function pickCustomsRules(date: string, rules: readonly CustomsRules[] = CUSTOMS_RULES): CustomsRules | null {
  const day = date.slice(0, 10)
  return rules.find(r => r.validFrom <= day && day <= r.validTo) ?? null
}

export type ImportInput = {
  fuel: ImportFuel
  /** Customs value, EUR. */
  valueEur: number
  /** Engine volume, cm3 (not for EVs). */
  cc?: number | null
  /** Model year. */
  year: number
  /** Battery capacity, kWh (EVs only). */
  kwh?: number | null
  /** Overrides the duty rate (a fraction, 0..1). */
  dutyRate?: number | null
  /** EUR.1 or an equivalent origin certificate: 0 % duty. */
  eur1?: boolean
  /** Year of the customs clearance. */
  nowYear: number
  /** NBU hryvnias per euro. */
  eurUah: number
}

export type ImportCosts = {
  rulesVersion: string
  fuel: ImportFuel
  ageK: number
  valueEur: number
  dutyRate: number
  dutyEur: number
  exciseEur: number
  vatEur: number
  /** duty + excise + VAT */
  taxesEur: number
  pensionRate: number
  pensionUah: number
  /** value + duty + excise + VAT + pension, in hryvnias at `eurUah`. */
  totalUah: number
  /** value + duty + excise + VAT, EUR (the pension fee is hryvnia-only). */
  totalEur: number
  /** Inputs the excise needs but did not get; the result is then a lower bound. */
  missing: ('cc' | 'kwh')[]
  /** True for hybrids: charged as their combustion engine, confirm in the Customs Service calculator. */
  estimate: boolean
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100

/** Full calendar years after the production year up to the clearance year, clamped to the rules' min..max. */
export function importAgeK(year: number, nowYear: number, rules: CustomsRules = UA_IMPORT_2026_1): number {
  return Math.min(rules.excise.ageMax, Math.max(rules.excise.ageMin, nowYear - year))
}

function pensionRate(valueUah: number, rules: CustomsRules): number {
  const { subsistenceMinimumUah, tiers, topRate } = rules.pension
  const tier = tiers.find(t => valueUah <= t.upToMinimums * subsistenceMinimumUah)
  return tier ? tier.rate : topRate
}

export function calcImportCosts(input: ImportInput, rules: CustomsRules = UA_IMPORT_2026_1): ImportCosts {
  const { fuel, valueEur, year, nowYear, eurUah } = input
  const cc = input.cc != null && input.cc > 0 ? input.cc : null
  const kwh = input.kwh != null && input.kwh > 0 ? input.kwh : null
  const isEv = fuel === 'ev'
  const ageK = importAgeK(year, nowYear, rules)
  const missing: ('cc' | 'kwh')[] = []

  const dutyRate = isEv || input.eur1 ? 0 : (input.dutyRate ?? rules.dutyRate)
  const dutyEur = round2(valueEur * dutyRate)

  let exciseEur = 0
  if (isEv) {
    if (kwh == null) missing.push('kwh')
    else exciseEur = round2(kwh * rules.excise.evEurPerKwh)
  } else if (cc == null) {
    missing.push('cc')
  } else {
    const band = fuel === 'diesel' ? rules.excise.diesel : rules.excise.petrol
    const base = cc > band.thresholdCc ? band.aboveEur : band.baseEur
    exciseEur = round2(base * (cc / 1000) * ageK)
  }

  const vatEur = round2((valueEur + dutyEur + exciseEur) * rules.vatRate)
  const taxesEur = round2(dutyEur + exciseEur + vatEur)

  const valueUah = valueEur * eurUah
  const pRate = isEv ? 0 : pensionRate(valueUah, rules)
  const pensionUah = round2(valueUah * pRate)

  const totalEur = round2(valueEur + taxesEur)
  return {
    rulesVersion: rules.version,
    fuel,
    ageK,
    valueEur,
    dutyRate,
    dutyEur,
    exciseEur,
    vatEur,
    taxesEur,
    pensionRate: pRate,
    pensionUah,
    totalUah: round2(totalEur * eurUah + pensionUah),
    totalEur,
    missing,
    estimate: fuel === 'hybrid'
  }
}

/** The three preset examples (also the unit-test fixtures); the first is the default of `/customs`. */
export const CUSTOMS_PRESETS = [
  { id: 'petrol', fuel: 'petrol', value: 10000, cc: 1600, year: 2020 },
  { id: 'diesel', fuel: 'diesel', value: 12000, cc: 2000, year: 2018 },
  { id: 'ev', fuel: 'ev', value: 15000, kwh: 60, year: 2023 }
] as const satisfies readonly (CustomsQuery & { id: string })[]

/**
 * `/customs?fuel=&value=&cc=&year=&kwh=&duty=&eur1=`. Every field is parsed on its own: a bad or missing one is
 * dropped (the form leaves it empty) instead of rejecting the whole link. `duty` is a duty rate in percent.
 */
export type CustomsQuery = {
  fuel?: ImportFuel
  value?: number
  cc?: number
  year?: number
  kwh?: number
  duty?: number
  eur1?: boolean
}

const queryFieldSchemas = {
  fuel: z.enum(IMPORT_FUELS),
  value: z.coerce.number().positive().max(10_000_000),
  cc: z.coerce.number().int().positive().max(20000),
  year: z.coerce.number().int().min(1900).max(2100),
  kwh: z.coerce.number().positive().max(1000),
  duty: z.coerce.number().min(0).max(100)
} as const

const TRUE_VALUES = new Set(['1', 'true', 'yes'])

/** Parses the route's search params; the second value is whether any known param was present and valid. */
export function parseCustomsQuery(params: URLSearchParams): { query: CustomsQuery; hasParams: boolean } {
  const query: CustomsQuery = {}
  for (const key of ['fuel', 'value', 'cc', 'year', 'kwh', 'duty'] as const) {
    const raw = params.get(key)
    if (raw == null || raw.trim() === '') continue
    const parsed = queryFieldSchemas[key].safeParse(raw.trim().toLowerCase())
    if (parsed.success) (query as Record<string, unknown>)[key] = parsed.data
  }
  const eur1 = params.get('eur1')
  if (eur1 != null && TRUE_VALUES.has(eur1.trim().toLowerCase())) query.eur1 = true
  return { query, hasParams: Object.keys(query).length > 0 }
}

/** The search string (without `?`) for a prefill link; unset fields are left out. */
export function buildCustomsQuery(query: CustomsQuery): string {
  const params = new URLSearchParams()
  if (query.fuel) params.set('fuel', query.fuel)
  if (query.value != null) params.set('value', String(Math.round(query.value)))
  if (query.cc != null) params.set('cc', String(Math.round(query.cc)))
  if (query.year != null) params.set('year', String(query.year))
  if (query.kwh != null) params.set('kwh', String(query.kwh))
  if (query.duty != null) params.set('duty', String(query.duty))
  if (query.eur1) params.set('eur1', '1')
  return params.toString()
}

/**
 * Free text (registry, NHTSA `FuelTypePrimary`, Prozorro lot text) to a customs fuel. Null when it cannot be
 * classified (gas-only, hydrogen, both petrol and diesel, unknown): the form field stays empty. Electric plus a
 * combustion fuel is a hybrid; callers prefilling a link leave hybrids for the user to pick.
 */
export function mapFuel(text: string | null | undefined): ImportFuel | null {
  if (!text) return null
  const t = text.toLowerCase()
  const hybrid = /hybrid|гібрид|гибрид|\bphev\b|\bmhev\b|plug-?in/.test(t)
  const electric = /electric|електро|электро|\bbev\b/.test(t)
  const diesel = /diesel|дизел/.test(t)
  const petrol = /petrol|gasoline|бензин/.test(t)
  if (diesel && petrol) return null
  if (hybrid) return 'hybrid'
  if (electric && (diesel || petrol)) return 'hybrid'
  if (electric) return 'ev'
  if (diesel) return 'diesel'
  if (petrol) return 'petrol'
  return null
}
