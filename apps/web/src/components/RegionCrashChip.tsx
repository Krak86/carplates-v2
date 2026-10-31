import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { toIntlLocale } from '@/lib/intl'
import { roadSafetyRegionsQuery } from '@/lib/queries'
import { localizeRegion } from '@/lib/region-label'
import { regionCrashFact } from '@/routes/road-safety/helpers'

type Props = {
  region: string | null
}

/**
 * Small "Region X: N crashes in 2025, rank k of 25" chip linking to /road-safety. Online-only background fetch (the
 * regions payload is small and cached at the edge); renders nothing until it resolves or when the region has no row.
 */
export default function RegionCrashChip({ region }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const regions = useQuery(roadSafetyRegionsQuery())
  const fact = regions.data && region ? regionCrashFact(regions.data, region) : null
  if (!fact || !region) return null

  const text = t('result.regionCrashes', {
    region: localizeRegion(region, i18n.language),
    crashes: fact.crashes.toLocaleString(toIntlLocale(i18n.language)),
    year: fact.year,
    rank: fact.rank,
    of: fact.of
  })

  return (
    <span className="inline-flex animate-chip-in items-center gap-1 rounded-full border chip-tone py-0.5 pr-2 pl-2 text-xs text-[var(--color-fg)] transition-colors chip-safety">
      <Link
        viewTransition
        to="/road-safety"
        title={t('result.regionCrashesTitle')}
        className="inline-flex items-center gap-1 transition-colors hover:text-[var(--color-primary)]"
      >
        <span aria-hidden>🚧</span>
        {text}
      </Link>
    </span>
  )
}
