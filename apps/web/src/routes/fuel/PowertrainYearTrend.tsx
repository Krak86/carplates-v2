import type { ReactNode } from 'react'
import type { PowertrainClass } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import { toIntlLocale } from '@/lib/intl'
import { formatPercent } from '@/routes/fuel/helpers'

type Props = {
  data: PowertrainClass
}

/** Share of each model year's cars that run on this fuel — shows how fast it is being adopted. */
export default function PowertrainYearTrend({ data }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const maxShare = Math.max(...data.byYear.map(y => y.share), 0.01)

  return (
    <div>
      <p className="mb-2 text-xs text-[var(--color-muted)]">{t('fuel.pt.yearShare')}</p>
      <ul className="space-y-1">
        {data.byYear.map(y => (
          <li key={y.year} className="grid grid-cols-[3rem_1fr_auto] items-center gap-2 text-sm">
            <span className="tabular-nums">{y.year}</span>

            <span className="h-3 overflow-hidden rounded-full bg-[var(--color-border)]/40">
              <span
                className="block h-full rounded-full bg-[var(--color-primary)]"
                style={{ width: `${(y.share / maxShare) * 100}%` }}
              />
            </span>

            <span className="text-right whitespace-nowrap tabular-nums">
              {formatPercent(y.share)}{' '}
              <span className="text-xs text-[var(--color-muted)]">
                {t('fuel.cars', { count: numberFormat.format(y.n) })}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
