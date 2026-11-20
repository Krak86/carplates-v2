import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'

import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import { safetyStatsQuery } from '@/lib/queries'
import HomeStatsSkeleton from '@/routes/stats/HomeStatsSkeleton'
import { lazyWithPacks } from '@/i18n/lazy-with-packs'

const SafetyModelsPanel = lazyWithPacks(() => import('@/routes/safety/SafetyModelsPanel'), 'safety')

/** Mounted by `LazySection`, so its query and chunk start only once the section nears the viewport. */
export default function HomeSafetySection(): ReactNode {
  const safetyStats = useQuery(safetyStatsQuery())

  if (safetyStats.isError) return null
  if (!safetyStats.data) return <HomeStatsSkeleton variant="models" />

  return (
    <LoadErrorBoundary compact>
      <div className="section-vt w-full max-w-6xl">
        <SafetyModelsPanel stats={safetyStats.data} />
      </div>
    </LoadErrorBoundary>
  )
}
