import { Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import Card from '@/components/ui/Card'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { wantedStatsQuery } from '@/lib/queries'
import StatsMapSkeleton from '@/routes/stats/StatsMapSkeleton'
import StatsSkeleton from '@/routes/stats/StatsSkeleton'
import { dimensionRows, groupYears, mapRows, withFoundPercent } from '@/routes/wanted/helpers'
import {
  DEFAULT_WANTED_DIMENSION,
  DEFAULT_WANTED_METRIC,
  DEFAULT_WANTED_VIEW,
  WANTED_DIMENSIONS,
  WANTED_DIMENSION_ICONS,
  WANTED_METRICS,
  WANTED_VIEWS
} from '@/routes/wanted/types'
import type { WantedDimension, WantedMetric, WantedView } from '@/routes/wanted/types'
import WantedRecentList from '@/routes/wanted/WantedRecentList'
import WantedStatsTable from '@/routes/wanted/WantedStatsTable'
import WantedYearChart from '@/routes/wanted/WantedYearChart'

const StatsMap = lazy(() => import('@/routes/stats/StatsMap'))

const TAB_ON = 'border-transparent bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
const TAB_OFF =
  'border-[var(--color-border)]/50 bg-[var(--color-surface)]/50 text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]'
const SEG_ON = 'border-transparent bg-[var(--color-bg)] font-medium text-[var(--color-fg)] shadow-sm'
const SEG_OFF =
  'border-[var(--color-border)]/50 bg-[var(--color-bg)]/50 text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'

function parseOf<T extends string>(list: readonly T[], value: string | null, fallback: T): T {
  return (list as readonly string[]).includes(value ?? '') ? (value as T) : fallback
}

// Lazy-loaded (see App.tsx).
export default function WantedStatsRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const online = useOnlineStatus()
  const stats = useQuery(wantedStatsQuery())
  const [searchParams, setSearchParams] = useSearchParams()

  const dim: WantedDimension = parseOf(WANTED_DIMENSIONS, searchParams.get('dim'), DEFAULT_WANTED_DIMENSION)
  const metric: WantedMetric = parseOf(WANTED_METRICS, searchParams.get('metric'), DEFAULT_WANTED_METRIC)
  const view: WantedView = parseOf(WANTED_VIEWS, searchParams.get('view'), DEFAULT_WANTED_VIEW)
  const effectiveDim = view === 'map' ? 'region' : dim

  const setParam = (key: string, value: string, drop?: string): void => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      params.set(key, value)
      if (drop) params.delete(drop)
      return params
    })
  }

  const handleDimensionChange = (next: WantedDimension): void =>
    setParam('dim', next, next === 'region' ? undefined : 'view')

  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const data = stats.data
  const summary = data?.summary

  const cards = summary
    ? [
        { label: t('wanted.stats.summary.wantedNow'), value: numberFormat.format(summary.wantedNow) },
        { label: t('wanted.stats.summary.foundTotal'), value: numberFormat.format(summary.foundTotal) },
        {
          label: t('wanted.stats.summary.medianDays'),
          value: summary.medianDaysToFound === null ? '-' : numberFormat.format(summary.medianDaysToFound)
        },
        { label: t('wanted.stats.summary.withVin'), value: numberFormat.format(summary.withVin) }
      ]
    : []

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="inline-block rounded-lg bg-[var(--color-bg)]/85 px-3 py-1.5 text-2xl font-bold backdrop-blur-sm">
          {t('wanted.stats.title')}
        </h1>

        {summary?.historySince && (
          <p className="inline-block rounded bg-[var(--color-bg)]/85 px-2 py-1 text-sm text-[var(--color-muted)] backdrop-blur-sm">
            {t('wanted.stats.historySince', { date: summary.historySince.slice(0, 10) })}
          </p>
        )}
      </div>

      {!online && (
        <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-300">
          {t('offline.needsConnection')}
        </p>
      )}

      {stats.isPending && stats.fetchStatus !== 'paused' && <StatsSkeleton variant="registry" />}

      {stats.isError && <p className="text-[var(--color-muted)]">{t('result.error')}</p>}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cards.map(c => (
              <Card key={c.label}>
                <div className="text-xs text-[var(--color-muted)] uppercase">{c.label}</div>
                <div className="text-xl font-semibold tabular-nums">{c.value}</div>
              </Card>
            ))}
          </div>

          <Card className="mb-6">
            <h2 className="mb-1 text-lg font-semibold">{t('wanted.stats.byYear')}</h2>
            <p className="mb-3 text-sm text-[var(--color-muted)]">{t('wanted.stats.byYearNote')}</p>

            <WantedYearChart rows={groupYears(data.byYear, t('wanted.stats.earlier'))} />
          </Card>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 rounded-lg bg-[var(--color-bg)]/85 p-1 backdrop-blur-sm">
              {WANTED_DIMENSIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDimensionChange(d)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm transition-colors duration-200',
                    d === effectiveDim ? TAB_ON : TAB_OFF
                  )}
                >
                  <span aria-hidden>{WANTED_DIMENSION_ICONS[d]}</span> {t(`wanted.stats.dimension.${d}`)}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {effectiveDim === 'region' && (
                <div className="inline-flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
                  {WANTED_VIEWS.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setParam('view', v)}
                      className={cn(
                        'rounded-md border px-3 py-1 text-sm transition-colors duration-200',
                        v === view ? SEG_ON : SEG_OFF
                      )}
                    >
                      {t(`stats.view.${v}`)}
                    </button>
                  ))}
                </div>
              )}

              {view === 'map' && (
                <div className="inline-flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
                  {WANTED_METRICS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setParam('metric', m)}
                      className={cn(
                        'rounded-md border px-3 py-1 text-sm transition-colors duration-200',
                        m === metric ? SEG_ON : SEG_OFF
                      )}
                    >
                      {t(`wanted.stats.col.${m}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div key={`${view}-${effectiveDim}-${metric}`} className="mb-8 animate-fade-in">
            {view === 'map' ? (
              <LoadErrorBoundary compact>
                <Suspense fallback={<StatsMapSkeleton />}>
                  <StatsMap rows={mapRows(data.byRegion, metric)} />
                </Suspense>
              </LoadErrorBoundary>
            ) : (
              <WantedStatsTable
                rows={withFoundPercent(dimensionRows(data, effectiveDim))}
                dimension={effectiveDim}
                labelHeader={t(`wanted.stats.dimension.${effectiveDim}`)}
                defaultSortKey="stolen"
              />
            )}
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-2 text-lg font-semibold">{t('wanted.stats.recentStolen')}</h2>
              <WantedRecentList vehicles={data.recentStolen} dateKind="stolen" />
            </Card>

            <Card>
              <h2 className="mb-2 text-lg font-semibold">{t('wanted.stats.recentFound')}</h2>
              <WantedRecentList vehicles={data.recentFound} dateKind="found" />
            </Card>
          </div>

          <p className="mb-6 text-xs text-[var(--color-muted)]">{t('wanted.stats.source')}</p>
        </>
      )}
    </div>
  )
}
