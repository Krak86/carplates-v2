import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { valueCurve, type RdwMatchInfo } from '@carplates/shared'

import { formatEur } from '@/components/EstimatedValue.helpers'
import ValueLineChart from '@/components/ValueLineChart'

type Props = {
  estimate: NonNullable<RdwMatchInfo['valueEstimate']>
  /** Median new price the curve is applied to. */
  newPrice: number
  locale: string
}

/** Longest age the chart draws; the curve ends sooner when the table runs out. */
const MAX_CHART_AGE = 20

/** Estimated value by age (new price x assumed curve) with this car marked; null when the curve is too short to draw. */
export default function ValueByAgeChart({ estimate, newPrice, locale }: Props): ReactNode {
  const { t } = useTranslation()
  const curve = valueCurve(newPrice, MAX_CHART_AGE)
  if (curve.length < 2) return null

  return (
    <figure>
      <figcaption className="mb-0.5 text-xs font-semibold">{t('value.chart.byAge')}</figcaption>
      <ValueLineChart
        points={curve.map(p => ({ x: p.ageYears, y: p.valueEur }))}
        mark={{ x: estimate.ageYears, y: estimate.midEur, low: estimate.lowEur, high: estimate.highEur }}
        ariaLabel={t('value.chart.byAge')}
        formatX={x => t('value.chart.ageTick', { age: x })}
        formatY={v => formatEur(v, locale)}
      />
    </figure>
  )
}
