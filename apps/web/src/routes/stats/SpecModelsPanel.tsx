import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DEFAULT_SPEC_METRIC, SPEC_METRICS, type SpecMetric } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import SectionInfo from '@/components/SectionInfo'
import Card from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { statsTopQuery } from '@/lib/queries'
import SpecModelList from '@/routes/stats/SpecModelList'
import HomeStatsSkeleton from '@/routes/stats/HomeStatsSkeleton'

/**
 * Highest / lowest passenger-car models by one spec — power, engine displacement, height, length, fuel tank — with a
 * metric tab row. Read from the same small `statsTopQuery()` payload as the weight boards; renders nothing before the
 * rollup is built (`db:refresh-spec-stats`), a skeleton while it loads.
 */
type Props = {
  /** One card per row at every width (for narrow containers, e.g. inside an article card). */
  stacked?: boolean
}

export default function SpecModelsPanel({ stacked = false }: Props): ReactNode {
  const { t } = useTranslation()
  const [metric, setMetric] = useState<SpecMetric>(DEFAULT_SPEC_METRIC)
  const { data, isPending, fetchStatus } = useQuery(statsTopQuery())
  if (isPending && fetchStatus !== 'paused') return <HomeStatsSkeleton variant="models" />

  const boards = data?.specBoards
  if (!boards || Object.keys(boards).length === 0) return null

  // A metric with no ranked model has no tab to open.
  const metrics = SPEC_METRICS.filter(m => (boards[m]?.highest.length ?? 0) > 0)
  const board = boards[metric]

  return (
    <div className="mb-6">
      <div role="group" aria-label={t('stats.spec.metric')} className="mb-3 flex flex-wrap items-center gap-1.5">
        {metrics.map(m => (
          <button
            key={m}
            type="button"
            aria-pressed={m === metric}
            onClick={() => setMetric(m)}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs',
              m === metric ? 'border-primary bg-primary text-white' : 'border-border text-fg'
            )}
          >
            {t(`stats.spec.metric.${m}`)}
          </button>
        ))}

        <SectionInfo section="statsSpec" title={t('stats.spec.title')} />
      </div>

      {board && (
        <div key={metric} className={cn('grid gap-3', !stacked && 'md:grid-cols-2')}>
          <Card>
            <SpecModelList title={t(`stats.spec.highest.${metric}`)} metric={metric} models={board.highest} />
          </Card>
          <Card>
            <SpecModelList title={t(`stats.spec.lowest.${metric}`)} metric={metric} models={board.lowest} />
          </Card>
        </div>
      )}
    </div>
  )
}
