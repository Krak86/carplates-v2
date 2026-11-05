import { Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import LiveView from '@/routes/alarms/LiveView'
import { cn } from '@/lib/cn'
import { alarmsQuery } from '@/lib/queries'
import StatsMapSkeleton from '@/routes/stats/StatsMapSkeleton'
import { ALARM_VIEWS, DEFAULT_ALARM_VIEW, parseAlarmView } from '@/routes/alarms/views'
import type { AlarmView } from '@/routes/alarms/views'

const CarsView = lazy(() => import('@/routes/alarms/CarsView'))
const RhythmView = lazy(() => import('@/routes/alarms/RhythmView'))
const RoadsView = lazy(() => import('@/routes/alarms/RoadsView'))

// Lazy-loaded (see App.tsx). Online-only: no `offline-cache.ts` entry. Informational, not a warning system.
export default function AlarmsRoute(): ReactNode {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = parseAlarmView(searchParams.get('view'))
  // One query for every view: switching tabs never refetches, and the map stays live.
  const alarms = useQuery(alarmsQuery())

  const handleViewChange = (next: AlarmView): void => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      if (next === DEFAULT_ALARM_VIEW) params.delete('view')
      else params.set('view', next)
      return params
    })
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="mb-4 inline-block rounded-lg bg-[var(--color-bg)]/85 px-3 py-1.5 text-2xl font-bold backdrop-blur-sm">
        {t('alarms.title')}
      </h1>
      <p className="mb-4 text-sm text-[var(--color-muted)]">{t('alarms.intro')}</p>

      {/* Hidden while the classic view is the only one. */}
      {ALARM_VIEWS.length > 1 && (
        <div
          role="tablist"
          className="mb-4 flex flex-wrap gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
        >
          {ALARM_VIEWS.map(v => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={v === view}
              onClick={() => handleViewChange(v)}
              className={cn(
                'flex-1 rounded-md border px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-200',
                v === view
                  ? 'border-transparent bg-[var(--color-primary)] font-medium text-[var(--color-primary-fg)]'
                  : 'border-transparent text-[var(--color-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'
              )}
            >
              {t(`alarms.view.${v}`)}
            </button>
          ))}
        </div>
      )}

      {view === 'live' && <LiveView data={alarms.data} isPending={alarms.isPending} isError={alarms.isError} />}
      {view === 'cars' && (
        <Suspense fallback={<StatsMapSkeleton />}>
          <CarsView data={alarms.data} isPending={alarms.isPending} isError={alarms.isError} />
        </Suspense>
      )}
      {view === 'rhythm' && (
        <Suspense fallback={<StatsMapSkeleton />}>
          <RhythmView data={alarms.data} isPending={alarms.isPending} isError={alarms.isError} />
        </Suspense>
      )}
      {view === 'roads' && (
        <Suspense fallback={<StatsMapSkeleton />}>
          <RoadsView data={alarms.data} isPending={alarms.isPending} isError={alarms.isError} />
        </Suspense>
      )}
    </div>
  )
}
