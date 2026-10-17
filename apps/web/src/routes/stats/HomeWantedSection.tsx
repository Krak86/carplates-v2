import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import Card from '@/components/ui/Card'
import { wantedStatsQuery } from '@/lib/queries'
import WantedRecentList from '@/routes/wanted/WantedRecentList'

const TEASER_SIZE = 5

/** Mounted by `LazySection`, so its query starts only once the section nears the viewport. */
export default function HomeWantedSection(): ReactNode {
  const { t } = useTranslation()
  const stats = useQuery(wantedStatsQuery())

  if (!stats.data?.recentStolen.length) return null

  return (
    <LoadErrorBoundary compact>
      <div className="section-vt w-full max-w-6xl">
        <Card>
          <h2 className="mb-2 text-lg font-semibold">
            <span aria-hidden>🚨</span> {t('wanted.stats.recentStolen')}
          </h2>

          <WantedRecentList vehicles={stats.data.recentStolen.slice(0, TEASER_SIZE)} dateKind="stolen" />

          <p className="mt-3 text-sm">
            <Link viewTransition to="/wanted" className="text-[var(--color-primary)] underline">
              {t('wanted.stats.viewLink')} →
            </Link>
          </p>
        </Card>
      </div>
    </LoadErrorBoundary>
  )
}
