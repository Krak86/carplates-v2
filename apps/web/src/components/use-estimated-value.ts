import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { Currency, FxResponse, RdwMatchInfo } from '@carplates/shared'

import { effectiveCurrency, ukrPrice, type UkrPrice } from '@/components/EstimatedValue.helpers'
import { fxQuery, rdwQuery } from '@/lib/queries'

export type ValueInput = {
  brand: string | null
  model: string | null
  year: number | null
  /** Registry kind text (ЛЕГКОВИЙ, МОТОЦИКЛ …): picks which RDW vehicle kinds the model may match. */
  kind?: string | null
  /** Registry fuel text and engine capacity: the inputs to Ukrainian excise. */
  fuel?: string | null
  capacity?: number | null
}

export type EstimatedValueData = {
  match: RdwMatchInfo
  estimate: NonNullable<RdwMatchInfo['valueEstimate']>
  price: UkrPrice
  currency: Currency
  fx: FxResponse | null
  locale: string
  /** The price has few vehicles behind it, or is extrapolated past the table. */
  rough: boolean
}

/**
 * The estimate shared by the card-header chip and the Estimated value section: the `/api/rdw` query (same key as Specs
 * and Recalls) plus the NBU rates, and the customs-inclusive price. `null` while loading, on error or without an RDW price.
 */
export function useEstimatedValue(input: ValueInput, wanted: Currency): EstimatedValueData | null {
  const { i18n } = useTranslation()
  const { brand, model, year, kind, fuel, capacity } = input
  const { data } = useQuery({
    ...rdwQuery(brand ?? '', model ?? '', year ?? 0, kind),
    enabled: !!(brand && model && year)
  })
  const match = data?.match
  const estimate = match?.valueEstimate
  // The NBU rates feed the currency switch and the hryvnia part of the copy button; until they arrive (or if they fail)
  // the figures stay in euros.
  const fx = useQuery({ ...fxQuery(), enabled: !!estimate }).data ?? null

  if (!match || !estimate || !year) return null

  return {
    match,
    estimate,
    price: ukrPrice(match, estimate, { fuel, capacityCc: capacity, makeYear: year }, new Date().getFullYear()),
    currency: effectiveCurrency(wanted, fx),
    fx,
    locale: i18n.language === 'ua' ? 'uk' : i18n.language,
    rough: !!(estimate.rough || estimate.extrapolated)
  }
}
