import type { ReactNode } from 'react'
import type { WantedStatsVehicle } from '@carplates/shared'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { displayBrand } from '@/lib/display-brand'
import { localizeRegion } from '@/lib/region-label'
import { dayOf } from '@/routes/wanted/helpers'

type Props = {
  vehicles: WantedStatsVehicle[]
  /** Which date to show: the theft date or the removal date. */
  dateKind: 'stolen' | 'found'
}

export default function WantedRecentList({ vehicles, dateKind }: Props): ReactNode {
  const { t, i18n } = useTranslation()

  if (vehicles.length === 0) return <p className="text-[var(--color-muted)]">{t('stats.noRows')}</p>

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {vehicles.map((v, i) => {
        const date = dayOf(dateKind === 'stolen' ? v.seizedAt : v.resolvedAt)
        const name = [v.brand ? displayBrand(v.brand) : null, v.model].filter(Boolean).join(' ')
        const details = [v.color?.toLowerCase(), localizeRegion(v.region, i18n.language)].filter(Boolean).join(' · ')

        return (
          <li
            key={`${v.plate ?? 'x'}-${v.seizedAt}-${i}`}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2"
          >
            <span className="w-24 shrink-0 text-xs text-[var(--color-muted)] tabular-nums">{date ?? '-'}</span>

            <span className="min-w-0 flex-1">
              <span className="font-medium">{name || '-'}</span>
              {details && <span className="ml-2 text-xs text-[var(--color-muted)]">{details}</span>}
            </span>

            {v.plate ? (
              <Link
                viewTransition
                to={`/${encodeURIComponent(v.plate)}`}
                className="font-mono text-[var(--color-primary)] underline"
              >
                {v.plate}
              </Link>
            ) : (
              <span className="text-xs text-[var(--color-muted)]">{t('wanted.stats.noPlate')}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
