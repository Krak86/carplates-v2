import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Currency, FxResponse, RdwMatchInfo } from '@carplates/shared'

import { formatMoneyRange, type UkrPrice } from '@/components/EstimatedValue.helpers'
import { approxCount } from '@/components/RdwSpecs.helpers'
import ValueByAgeChart from '@/components/ValueByAgeChart'

type Props = {
  match: RdwMatchInfo
  estimate: NonNullable<RdwMatchInfo['valueEstimate']>
  price: UkrPrice
  currency: Currency
  fx: FxResponse | null
  locale: string
}

/** Hover tip of the value chip: the EU value-by-age chart first, then one short line with the sample behind it. */
export default function EstimatedValueTip({ match, estimate, price, currency, fx, locale }: Props): ReactNode {
  const { t } = useTranslation()
  const newPrice = estimate.newPriceEur ?? match.specs.priceEur?.median
  const rough = estimate.rough || estimate.extrapolated

  return (
    <div className="space-y-2">
      {newPrice != null && <ValueByAgeChart estimate={estimate} newPrice={newPrice} locale={locale} />}

      <p className="text-xs text-[var(--color-muted)]">
        {t('value.tip', {
          eu: formatMoneyRange(estimate.lowEur, estimate.highEur, currency, fx, locale),
          ua: formatMoneyRange(price.low.totalEur, price.high.totalEur, currency, fx, locale),
          n: approxCount(estimate.priceN ?? match.specs.n, locale),
          year: match.specs.year
        })}
        {rough && ` ⚠️ ${t('value.tipRough')}`}
      </p>
    </div>
  )
}
