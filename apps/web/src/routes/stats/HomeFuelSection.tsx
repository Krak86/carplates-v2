import { lazy } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'

import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import { fuelStatsQuery } from '@/lib/queries'
import HomeStatsSkeleton from '@/routes/stats/HomeStatsSkeleton'

const FuelModelsPanel = lazy(() => import('@/routes/fuel/FuelModelsPanel'))

/** Mounted by `LazySection`, so its query and chunk start only once the section nears the viewport. */
export default function HomeFuelSection(): ReactNode {
  const fuelStats = useQuery(fuelStatsQuery())

  if (fuelStats.isError) return null
  if (!fuelStats.data) return <HomeStatsSkeleton variant="models" />

  return (
    <LoadErrorBoundary compact>
      <div className="section-vt w-full max-w-6xl">
        <FuelModelsPanel stats={fuelStats.data} />
      </div>
    </LoadErrorBoundary>
  )
}
