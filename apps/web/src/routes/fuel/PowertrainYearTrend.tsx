import type { ReactNode } from 'react'
import type { PowertrainClass } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import BarList from '@/components/charts/BarList'
import { toIntlLocale } from '@/lib/intl'
import { formatPercent } from '@/routes/fuel/helpers'

type Props = {
  data: PowertrainClass
}

/** Share of each model year's cars that run on this fuel — shows how fast it is being adopted. */
export default function PowertrainYearTrend({ data }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const items = data.byYear.map(y => ({
    key: String(y.year),
    label: String(y.year),
    value: y.share,
    display: (
      <>
        {formatPercent(y.share)}{' '}
        <span className="text-xs font-normal text-[var(--color-muted)]">
          {t('fuel.cars', { count: numberFormat.format(y.n) })}
        </span>
      </>
    )
  }))

  return (
    <div>
      <p className="mb-2 text-xs text-[var(--color-muted)]">{t('fuel.pt.yearShare')}</p>
      <BarList
        items={items}
        labelClassName="w-12"
        valueClassName="w-auto min-w-24 whitespace-nowrap"
        barClassName="h-3"
      />
    </div>
  )
}
