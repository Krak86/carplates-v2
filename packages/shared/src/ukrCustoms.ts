import { resolveFuelCategories } from './vehicleFuel.js'

/**
 * Stage C4+ — rough Ukrainian customs charges on a used passenger car imported today, added to the EU value.
 *
 * Excise: Tax Code art. 215, as amended by Law 2611-VIII of 08.11.2018 (https://zakon.rada.gov.ua/go/2611-19):
 * rate = base rate x cc / 1000 x age coefficient; petrol 50 EUR (100 above 3000 cc), diesel 75 EUR (150 above 3500 cc),
 * electric 1 EUR per kWh of battery. The age coefficient counts full calendar years from the year after production,
 * at least 1, at most 15. Import duty 10 % (0 % electric) and VAT 20 % (electric too since 1 Jan 2026) of customs
 * value + duty + excise come from the Customs Service calculator pages and brokers (read 2026-10-09; the primary texts
 * were not retrievable). Not modelled: the pension fee (sources disagree), delivery, dealer margin, battery excise.
 */

export const UKR_DUTY_RATE = 0.1
export const UKR_VAT_RATE = 0.2

/** The fuel classes the customs rules tell apart; hybrids and gas count as the combustion fuel they run on. */
export type CustomsFuel = 'petrol' | 'diesel' | 'electric'

/** Registry fuel text → customs class; null when unknown (no excise can be worked out). */
export function customsFuel(fuel: string | null | undefined): CustomsFuel | null {
  const cats = resolveFuelCategories(fuel)
  if (cats.length === 0) return null
  if (cats.every(c => c === 'electric')) return 'electric'
  if (cats.includes('diesel')) return 'diesel'
  if (cats.includes('petrol') || cats.includes('gas')) return 'petrol'
  return null
}

const MAX_AGE_K = 15

/** Age coefficient: full calendar years after the production year, clamped to 1..15. */
export const customsAgeK = (makeYear: number, nowYear: number): number =>
  Math.min(MAX_AGE_K, Math.max(1, nowYear - makeYear - 1))

/** Excise base rate in EUR per 1000 cc. */
const exciseBase = (fuel: 'petrol' | 'diesel', cc: number): number =>
  fuel === 'diesel' ? (cc > 3500 ? 150 : 75) : cc > 3000 ? 100 : 50

export type CustomsInput = {
  /** Customs value, EUR — here the EU value estimate. */
  baseEur: number
  fuel: CustomsFuel | null
  capacityCc: number | null
  makeYear: number
  nowYear: number
}

export type CustomsTax = {
  baseEur: number
  dutyEur: number
  exciseEur: number
  vatEur: number
  /** duty + excise + VAT */
  taxEur: number
  /** base + taxes */
  totalEur: number
  ageK: number
  /** False when the excise could not be worked out (unknown fuel or capacity, or battery size for an electric car). */
  exciseKnown: boolean
}

export function customsTax({ baseEur, fuel, capacityCc, makeYear, nowYear }: CustomsInput): CustomsTax {
  const ageK = customsAgeK(makeYear, nowYear)
  const dutyEur = fuel === 'electric' ? 0 : baseEur * UKR_DUTY_RATE
  const canExcise = (fuel === 'petrol' || fuel === 'diesel') && capacityCc != null && capacityCc > 0
  const exciseEur = canExcise ? exciseBase(fuel, capacityCc) * (capacityCc / 1000) * ageK : 0
  const vatEur = (baseEur + dutyEur + exciseEur) * UKR_VAT_RATE
  const taxEur = dutyEur + exciseEur + vatEur
  return { baseEur, dutyEur, exciseEur, vatEur, taxEur, totalEur: baseEur + taxEur, ageK, exciseKnown: canExcise }
}
