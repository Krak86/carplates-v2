import { Suspense, lazy, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { statsQuery } from '@/lib/queries'
import { dimensionHasYearColumn, dimensionRows, yearBoundaryLabel, yearRange } from '@/routes/stats/helpers'
import StatsTable from '@/routes/stats/StatsTable'
import TopStatsPanel from '@/routes/stats/TopStatsPanel'
import {
  DEFAULT_STATS_DIMENSION,
  DEFAULT_STATS_METRIC,
  DEFAULT_STATS_VIEW,
  DIMENSION_ICONS,
  METRIC_ICONS,
  STATS_DIMENSIONS,
  STATS_METRICS,
  STATS_VIEWS
} from '@/routes/stats/types'
import type { StatsDimension, StatsMetric, StatsView } from '@/routes/stats/types'

const StatsMap = lazy(() => import('@/routes/stats/StatsMap'))

function parseDimension(value: string | null): StatsDimension {
  return (STATS_DIMENSIONS as readonly string[]).includes(value ?? '')
    ? (value as StatsDimension)
    : DEFAULT_STATS_DIMENSION
}

function parseMetric(value: string | null): StatsMetric {
  return (STATS_METRICS as readonly string[]).includes(value ?? '') ? (value as StatsMetric) : DEFAULT_STATS_METRIC
}

function parseView(value: string | null): StatsView {
  return (STATS_VIEWS as readonly string[]).includes(value ?? '') ? (value as StatsView) : DEFAULT_STATS_VIEW
}

// Lazy-loaded (see App.tsx).
export default function StatsRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const stats = useQuery(statsQuery())
  const [searchParams, setSearchParams] = useSearchParams()
  // Captured once at mount, like ResultCard's `isSharedHistory` — a ResultCard badge deep
  // link (?dim=brand&highlight=VOLKSWAGEN, or ?highlightModel=VOLKSWAGEN::PASSAT for the
  // model panel, which has no dimension tab of its own) scrolls to and flashes that one row,
  // once, regardless of any tab/sort the user changes afterward.
  const [highlightLabel] = useState(() => searchParams.get('highlight') ?? undefined)
  const [highlightModel] = useState(() => {
    const raw = searchParams.get('highlightModel')
    if (!raw) return null
    const [brand, model] = raw.split('::')
    return brand && model ? { brand, model } : null
  })

  const dim = parseDimension(searchParams.get('dim'))
  const metric = parseMetric(searchParams.get('metric'))
  const view = parseView(searchParams.get('view'))
  const effectiveDim = view === 'map' ? 'region' : dim
  const visibleDimensions =
    view === 'map' ? (['region'] as const satisfies readonly StatsDimension[]) : STATS_DIMENSIONS

  const handleDimensionChange = (next: StatsDimension): void => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      params.set('dim', next)
      if (next !== 'region') params.delete('view')
      return params
    })
  }

  const handleMetricChange = (next: StatsMetric): void => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      params.set('metric', next)
      return params
    })
  }

  const handleViewChange = (next: StatsView): void => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      params.set('view', next)
      return params
    })
  }

  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const range = stats.data ? yearRange(stats.data) : null

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="inline-block rounded-lg bg-[var(--color-bg)]/85 px-3 py-1.5 text-2xl font-bold backdrop-blur-sm">
          {t('stats.title')}
        </h1>

        {stats.isSuccess && range && (
          <p className="inline-block rounded bg-[var(--color-bg)]/85 px-2 py-1 text-sm text-[var(--color-muted)] backdrop-blur-sm">
            {t('stats.yearRange', {
              min: yearBoundaryLabel(range.min, toIntlLocale(i18n.language)),
              max: yearBoundaryLabel(range.max, toIntlLocale(i18n.language))
            })}
          </p>
        )}
      </div>

      {stats.isPending && (
        <p className="flex items-center gap-2 text-[var(--color-muted)]">
          <Spinner /> {t('result.loading')}
        </p>
      )}

      {stats.isError && <p className="text-[var(--color-muted)]">{t('result.error')}</p>}

      {stats.isSuccess && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <div className="text-xs text-[var(--color-muted)] uppercase">{t('stats.summary.totalRows')}</div>
              <div className="text-xl font-semibold">{numberFormat.format(stats.data.summary.totalRows)}</div>
            </Card>
            <Card>
              <div className="text-xs text-[var(--color-muted)] uppercase">{t('stats.summary.distinctPlates')}</div>
              <div className="text-xl font-semibold">{numberFormat.format(stats.data.summary.distinctPlates)}</div>
            </Card>
            <Card>
              <div className="text-xs text-[var(--color-muted)] uppercase">{t('stats.summary.distinctVins')}</div>
              <div className="text-xl font-semibold">{numberFormat.format(stats.data.summary.distinctVins)}</div>
            </Card>
            <Card>
              <div className="text-xs text-[var(--color-muted)] uppercase">{t('stats.summary.plateless')}</div>
              <div className="text-xl font-semibold">{numberFormat.format(stats.data.summary.plateless)}</div>
            </Card>
          </div>

          <TopStatsPanel stats={stats.data} highlightModel={highlightModel} />

          <div className="mb-4 inline-flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
            {STATS_VIEWS.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => handleViewChange(v)}
                className={cn(
                  'rounded-md border px-3 py-1 text-sm transition-colors duration-200',
                  v === view
                    ? 'border-transparent bg-[var(--color-bg)] font-medium text-[var(--color-fg)] shadow-sm'
                    : 'border-[var(--color-border)]/50 bg-[var(--color-bg)]/50 text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'
                )}
              >
                {t(`stats.view.${v}`)}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 rounded-lg bg-[var(--color-bg)]/85 p-1 backdrop-blur-sm">
              {visibleDimensions.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDimensionChange(d)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm transition-colors duration-200',
                    d === effectiveDim
                      ? 'border-transparent bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                      : 'border-[var(--color-border)]/50 bg-[var(--color-surface)]/50 text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]'
                  )}
                >
                  <span aria-hidden>{DIMENSION_ICONS[d]}</span> {t(`stats.dimension.${d}`)}
                </button>
              ))}
            </div>

            <div className="inline-flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
              {STATS_METRICS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMetricChange(m)}
                  className={cn(
                    'rounded-md border px-3 py-1 text-sm transition-colors duration-200',
                    m === metric
                      ? 'border-transparent bg-[var(--color-bg)] font-medium text-[var(--color-fg)] shadow-sm'
                      : 'border-[var(--color-border)]/50 bg-[var(--color-bg)]/50 text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'
                  )}
                >
                  <span aria-hidden>{METRIC_ICONS[m]}</span> {t(`stats.column.${m}`)}
                </button>
              ))}
            </div>
          </div>

          <div key={`${view}-${effectiveDim}-${metric}`} className="animate-fade-in">
            {view === 'map' ? (
              <Suspense fallback={<Spinner />}>
                <StatsMap rows={dimensionRows(stats.data, 'region')} metric={metric} />
              </Suspense>
            ) : (
              <StatsTable
                rows={dimensionRows(stats.data, effectiveDim)}
                labelHeader={t(`stats.dimension.${effectiveDim}`)}
                showYearColumn={dimensionHasYearColumn(effectiveDim)}
                defaultSortKey={metric}
                highlightLabel={highlightLabel}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
