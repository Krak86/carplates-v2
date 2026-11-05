import { Suspense, lazy, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import ActiveAlarmList from '@/routes/alarms/ActiveAlarmList'
import LazySection from '@/components/LazySection'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { alarmsQuery } from '@/lib/queries'
import { ALARM_FILL, levelFill, sortedAlarms } from '@/routes/alarms/helpers'
import StatsMapSkeleton from '@/routes/stats/StatsMapSkeleton'

const LEGEND = [
  { key: 'red', fill: levelFill('Red', false), label: 'alarms.legend.red' },
  { key: 'yellow', fill: levelFill('Yellow', false), label: 'alarms.legend.yellow' },
  { key: 'none', fill: ALARM_FILL.none, label: 'alarms.status.none' }
] as const

const AlarmMap = lazy(() => import('@/routes/alarms/AlarmMap'))
const AlarmStatsSection = lazy(() => import('@/routes/alarms/AlarmStatsSection'))
const AlarmHistorySection = lazy(() => import('@/routes/alarms/AlarmHistorySection'))
const LossesSection = lazy(() => import('@/routes/alarms/LossesSection'))

// Lazy-loaded (see App.tsx). Online-only: no `offline-cache.ts` entry. Informational, not a warning system.
export default function AlarmsRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const [showLabels, setShowLabels] = useState(true)
  const alarms = useQuery(alarmsQuery())
  const data = alarms.data
  const count = data?.regions.length ?? 0
  const time = data
    ? new Date(data.fetchedAt).toLocaleTimeString(toIntlLocale(i18n.language), { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="mb-4 inline-block rounded-lg bg-[var(--color-bg)]/85 px-3 py-1.5 text-2xl font-bold backdrop-blur-sm">
        {t('alarms.title')}
      </h1>
      <p className="mb-4 text-sm text-[var(--color-muted)]">{t('alarms.intro')}</p>

      {alarms.isPending && <StatsMapSkeleton />}

      {/* 503 (no or stale data) is an error here: say "no data", never draw a calm map. */}
      {/* The base map still draws, dimmed and without any alert colour, so it cannot read as "calm". */}
      {alarms.isError && (
        <Card className="mb-6">
          <p className="mb-3 text-[var(--color-muted)]">{t('alarms.noData')}</p>
          <div className="opacity-40 grayscale">
            <LoadErrorBoundary compact>
              <Suspense fallback={<StatsMapSkeleton />}>
                <AlarmMap regions={[]} showLabels={showLabels} />
              </Suspense>
            </LoadErrorBoundary>
          </div>
        </Card>
      )}

      {data && (
        <Card className="mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-medium">{t('alarms.count', { count })}</span>
            {time && <span className="text-[var(--color-muted)]">{t('alarms.updated', { time })}</span>}
            <span className="text-xs text-[var(--color-muted)]">{t('alarms.refresh')}</span>
            <button
              type="button"
              aria-pressed={showLabels}
              onClick={() => setShowLabels(v => !v)}
              className="ml-auto rounded-md border border-[var(--color-border)] px-2 py-0.5 text-xs aria-pressed:bg-[var(--color-border)]"
            >
              {t('alarms.showRegions')}
            </button>
          </div>

          <p className="mb-3 text-xs text-[var(--color-muted)]">{t('alarms.source')}</p>

          <LoadErrorBoundary compact>
            <Suspense fallback={<StatsMapSkeleton />}>
              <AlarmMap regions={data.regions} showLabels={showLabels} />
            </Suspense>
          </LoadErrorBoundary>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
            {LEGEND.map(item => (
              <li key={item.key} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block size-3 rounded-sm border border-[var(--color-border)]"
                  style={{ background: item.fill }}
                />
                {t(item.label)}
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-[var(--color-muted)]">
            {t('alarms.movement')}{' '}
            <a
              href="https://alerts.in.ua"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-[var(--color-fg)]"
            >
              {t('alarms.movementLink')}
            </a>
          </p>

          <ActiveAlarmList regions={sortedAlarms(data.regions)} nowIso={data.fetchedAt} />
        </Card>
      )}

      {/* Own recorder: shows even when the live feed is down (it answers from the database). */}
      <LazySection fallback={<StatsMapSkeleton />}>
        <LoadErrorBoundary compact>
          <AlarmStatsSection />
        </LoadErrorBoundary>
      </LazySection>

      {/* War-loss figures come from our own daily copy, so they show even when the live feed is down. */}
      <LazySection sections={['losses']} fallback={<StatsMapSkeleton />}>
        <LoadErrorBoundary compact>
          <LossesSection />
        </LoadErrorBoundary>
      </LazySection>

      {/* History comes from our own table, so it shows even when the live feed is down. */}
      <LazySection fallback={<StatsMapSkeleton />}>
        <LoadErrorBoundary compact>
          <AlarmHistorySection />
        </LoadErrorBoundary>
      </LazySection>
    </div>
  )
}
