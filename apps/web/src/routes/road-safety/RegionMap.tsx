import { Suspense, lazy, useState } from 'react'
import type { ReactNode } from 'react'
import type { RoadSafetyRegionsResponse } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import Card from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { mapRows, REGION_MAP_METRICS } from '@/routes/road-safety/helpers'
import type { RegionMapMetric } from '@/routes/road-safety/helpers'
import StatsMapSkeleton from '@/routes/stats/StatsMapSkeleton'

// The same choropleth as /stats (geoBoundaries ADM1, ODbL; its attribution line is part of the map).
const StatsMap = lazy(() => import('@/routes/stats/StatsMap'))

type Props = {
  regions: RoadSafetyRegionsResponse['regions']
}

const DEFAULT_METRIC: RegionMapMetric = 'deaths'

/** Region choropleth of deaths or deaths per 100k cars; a region without data for the year is drawn as "no data". */
export default function RegionMap({ regions }: Props): ReactNode {
  const { t } = useTranslation()
  const [metric, setMetric] = useState<RegionMapMetric>(DEFAULT_METRIC)

  return (
    <Card className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{t('roadSafety.map.title')}</h2>

        <div className="inline-flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
          {REGION_MAP_METRICS.map(value => (
            <button
              key={value}
              type="button"
              aria-pressed={value === metric}
              onClick={() => setMetric(value)}
              className={cn(
                'rounded-md border px-3 py-1 text-sm transition-colors duration-200',
                value === metric
                  ? 'border-transparent bg-[var(--color-bg)] font-medium text-[var(--color-fg)] shadow-sm'
                  : 'border-[var(--color-border)]/50 bg-[var(--color-bg)]/50 text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'
              )}
            >
              {t(`roadSafety.map.metric.${value}`)}
            </button>
          ))}
        </div>
      </div>

      <LoadErrorBoundary compact>
        <Suspense fallback={<StatsMapSkeleton />}>
          <StatsMap rows={mapRows(regions, metric)} />
        </Suspense>
      </LoadErrorBoundary>
    </Card>
  )
}
