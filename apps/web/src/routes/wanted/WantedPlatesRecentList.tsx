import type { ReactNode } from 'react'
import type { WantedPlateRecent } from '@carplates/shared'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { localizeRegion } from '@/lib/region-label'

type Props = {
  plates: WantedPlateRecent[]
}

export default function WantedPlatesRecentList({ plates }: Props): ReactNode {
  const { t, i18n } = useTranslation()

  if (plates.length === 0) return <p className="text-[var(--color-muted)]">{t('stats.noRows')}</p>

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {plates.map(p => (
        <li key={`${p.plate}-${p.seizedAt}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
          <span className="w-24 shrink-0 text-xs text-[var(--color-muted)] tabular-nums">{p.seizedAt ?? '-'}</span>

          <span className="min-w-0 flex-1 text-xs text-[var(--color-muted)]">
            {[localizeRegion(p.region, i18n.language), p.unit].filter(Boolean).join(' · ')}
          </span>

          <Link
            viewTransition
            to={`/${encodeURIComponent(p.plate)}`}
            className="font-mono text-[var(--color-primary)] underline"
          >
            {p.plate}
          </Link>
        </li>
      ))}
    </ul>
  )
}
