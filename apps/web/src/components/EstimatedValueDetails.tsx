import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { type RdwMatchInfo } from '@carplates/shared'

import { formatEur, formatMoneyRange } from '@/components/EstimatedValue.helpers'
import { approxCount } from '@/components/RdwSpecs.helpers'
import InfoText from '@/components/InfoText'
import ValueByAgeChart from '@/components/ValueByAgeChart'
import ValueLineChart from '@/components/ValueLineChart'

type Props = {
  match: RdwMatchInfo
  estimate: NonNullable<RdwMatchInfo['valueEstimate']>
  locale: string
}

/**
 * Explanation plus the two charts behind the "Est. value" chip: the Dutch new price by model year (real RDW data) and
 * the estimated value by age (that price x an assumed curve). Shared by the chip's popover and the Specs folder.
 */
export default function EstimatedValueDetails({ match, estimate, locale }: Props): ReactNode {
  const { t } = useTranslation()
  const newPrice = estimate.newPriceEur ?? match.specs.priceEur?.median
  const byYear = match.priceByYear ?? []
  const name = `${match.makeName} ${match.modelName}`
  const eur = (v: number): string => formatEur(v, locale)

  const text = [
    t('value.info.lead'),
    t('value.info.how', {
      name,
      age: estimate.ageYears,
      percent: Math.round(estimate.retained * 100),
      price: eur(Math.round((newPrice ?? 0) / 100) * 100)
    }),
    t('rdw.info.sample', { n: approxCount(estimate.priceN ?? match.specs.n, locale), year: match.specs.year }),
    estimate.rough && t('value.info.rough', { n: estimate.priceN ?? 0 }),
    !match.exactYear && t('value.info.nearYear', { year: match.specs.year }),
    t('value.info.range'),
    t('value.info.credit')
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div className="space-y-3">
      <p className="font-semibold">{formatMoneyRange(estimate.lowEur, estimate.highEur, 'EUR', null, locale)}</p>
      <InfoText text={text} highlight={[name]} />

      {byYear.length >= 2 && (
        <figure>
          <figcaption className="mb-0.5 text-xs font-semibold">{t('value.chart.newPrice')}</figcaption>
          <ValueLineChart
            points={byYear.map(p => ({ x: p.year, y: p.priceEur }))}
            mark={newPrice != null ? { x: match.specs.year, y: newPrice } : undefined}
            ariaLabel={t('value.chart.newPrice')}
            formatX={x => String(x)}
            formatY={eur}
          />
        </figure>
      )}

      {newPrice != null && <ValueByAgeChart estimate={estimate} newPrice={newPrice} locale={locale} />}
    </div>
  )
}
