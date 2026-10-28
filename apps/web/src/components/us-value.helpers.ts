import { customsFuel, customsTax, estimateValue, type CustomsTax, type FxResponse } from '@carplates/shared'

/** DOM id of the US base price block: the VIN details row scrolls to it. */
export const US_PRICE_ANCHOR_ID = 'us-base-price'

/** Extra half-width on top of the EU range: a US trim price is further from a Ukrainian import than a Dutch median. */
export const US_EXTRA_SPREAD = 0.1
/** US and EU new prices further apart than this (share of the EU one) trigger a "spec may differ" warning. */
export const US_EU_DIFF_WARN = 0.3

const round100 = (eur: number): number => Math.round(eur / 100) * 100

/** NHTSA "Base Price ($)": the US MSRP of the decoded trim, USD. Null when the manufacturer did not submit one. */
export function usBasePriceUsd(fields: ReadonlyMap<string, string>): number | null {
  const n = Number(fields.get('Base Price ($)'))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** US dollars → euros through the NBU cross rate (UAH per USD / UAH per EUR). */
export const usdToEur = (usd: number, fx: Pick<FxResponse, 'eurUah' | 'usdUah'>): number =>
  (usd * fx.usdUah) / fx.eurUah

export type UsValue = {
  baseEur: number
  ageYears: number
  retained: number
  extrapolated: boolean
  spread: number
  midEur: number
  lowEur: number
  highEur: number
  mid: CustomsTax
  low: CustomsTax
  high: CustomsTax
}

type UsValueInput = {
  baseUsd: number
  fx: Pick<FxResponse, 'eurUah' | 'usdUah'>
  makeYear: number
  nowYear: number
  fuel: string | null | undefined
  capacityCc: number | null | undefined
}

/**
 * US MSRP → rough used value (same Dutch BPM curve as the EU estimate, wider range) → the same car imported to
 * Ukraine, customs paid. Null when the curve gives nothing (negligible value, bad age).
 */
export function usValue({ baseUsd, fx, makeYear, nowYear, fuel, capacityCc }: UsValueInput): UsValue | null {
  const baseEur = usdToEur(baseUsd, fx)
  const est = estimateValue(baseEur, nowYear - makeYear)
  if (!est) return null
  const spread = Math.min(est.spread + US_EXTRA_SPREAD, 0.5)
  const mid = est.midEur
  const lowEur = round100(mid * (1 - spread))
  const highEur = round100(mid * (1 + spread))
  const at = (eur: number): CustomsTax =>
    customsTax({ baseEur: eur, fuel: customsFuel(fuel), capacityCc: capacityCc ?? null, makeYear, nowYear })
  return {
    baseEur,
    ageYears: est.ageYears,
    retained: est.retained,
    extrapolated: est.extrapolated,
    spread,
    midEur: mid,
    lowEur,
    highEur,
    mid: at(mid),
    low: at(lowEur),
    high: at(highEur)
  }
}

export type UsEuGap = {
  /** US price / EU price - 1 (0.2 = the US trim costs 20 % more). */
  gap: number
  differs: boolean
}

/** Compares the US MSRP with the Dutch new price ex-tax (both new-car, both without VAT); null without both. */
export function usEuGap(usEur: number, euExTaxEur: number | null | undefined): UsEuGap | null {
  if (!(usEur > 0) || euExTaxEur == null || !(euExTaxEur > 0)) return null
  const gap = usEur / euExTaxEur - 1
  return { gap, differs: Math.abs(gap) > US_EU_DIFF_WARN }
}

/**
 * Aged US-based value vs the EU estimate. The EU one starts from a Dutch price with VAT and BPM inside, so it
 * runs higher than the US one by design: only a US value far below it (< half) or above it (> 30 %) is a mismatch.
 */
export function agedValuesDiffer(usMidEur: number, euMidEur: number): boolean {
  if (!(usMidEur > 0) || !(euMidEur > 0)) return false
  const ratio = usMidEur / euMidEur
  return ratio < 0.5 || ratio > 1.3
}
