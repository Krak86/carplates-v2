import { Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import type { WantedPlatesStats, WantedStatsResponse } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import Card from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import StatsMapSkeleton from '@/routes/stats/StatsMapSkeleton'
import { groupYears, mapRows, plateDimensionRows, withFoundPercent } from '@/routes/wanted/helpers'
import { WANTED_PLATE_DIMENSIONS, WANTED_PLATE_DIMENSION_ICONS, WANTED_VIEWS } from '@/routes/wanted/types'
import type { WantedPlateDimension, WantedView } from '@/routes/wanted/types'
import WantedPlatesRecentList from '@/routes/wanted/WantedPlatesRecentList'
import WantedStatsTable from '@/routes/wanted/WantedStatsTable'
import WantedYearChart from '@/routes/wanted/WantedYearChart'

const StatsMap = lazy(() => import('@/routes/stats/StatsMap'))

const TAB_ON = 'border-transparent bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
const TAB_OFF =
  'border-[var(--color-border)]/50 bg-[var(--color-surface)]/50 text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]'
const SEG_ON = 'border-transparent bg-[var(--color-bg)] font-medium text-[var(--color-fg)] shadow-sm'
const SEG_OFF =
  'border-[var(--color-border)]/50 bg-[var(--color-bg)]/50 text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'

type Props = {
  data: WantedStatsResponse
  plates: WantedPlatesStats
  dim: WantedPlateDimension
  view: WantedView
  onDimensionChange: (dim: WantedPlateDimension) => void
  onViewChange: (view: WantedView) => void
}

/** The Garpun (wanted plates) side of `/wanted`: year chart, region (table / map) and police-unit breakdowns. */
export default function WantedPlatesPanel({
  data,
  plates,
  dim,
  view,
  onDimensionChange,
  onViewChange
}: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const effectiveView = dim === 'region' ? view : 'table'
  const rows = plateDimensionRows(data, dim)
  const { summary } = plates

  const cards = [
    { label: t('wanted.stats.plates.summary.wantedNow'), value: numberFormat.format(summary.wantedNow) },
    { label: t('wanted.stats.plates.summary.resolved'), value: numberFormat.format(summary.resolvedTotal) },
    { label: t('wanted.stats.plates.summary.withDate'), value: numberFormat.format(summary.withDate) },
    {
      label: t('wanted.stats.plates.summary.trackedSince'),
      value: summary.trackedSince ? summary.trackedSince.slice(0, 10) : '-'
    }
  ]

  return (
    <>
      <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
        {t('wanted.stats.plates.intro')}
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(c => (
          <Card key={c.label}>
            <div className="text-xs text-[var(--color-muted)] uppercase">{c.label}</div>
            <div className="text-xl font-semibold tabular-nums">{c.value}</div>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <h2 className="mb-1 text-lg font-semibold">{t('wanted.stats.plates.byYear')}</h2>
        <p className="mb-3 text-sm text-[var(--color-muted)]">{t('wanted.stats.plates.byYearNote')}</p>

        <WantedYearChart rows={groupYears(plates.byYear, t('wanted.stats.earlier'))} />
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg bg-[var(--color-bg)]/85 p-1 backdrop-blur-sm">
          {WANTED_PLATE_DIMENSIONS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => onDimensionChange(d)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm transition-colors duration-200',
                d === dim ? TAB_ON : TAB_OFF
              )}
            >
              <span aria-hidden>{WANTED_PLATE_DIMENSION_ICONS[d]}</span> {t(`wanted.stats.plates.dimension.${d}`)}
            </button>
          ))}
        </div>

        {dim === 'region' && (
          <div className="inline-flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
            {WANTED_VIEWS.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => onViewChange(v)}
                className={cn(
                  'rounded-md border px-3 py-1 text-sm transition-colors duration-200',
                  v === effectiveView ? SEG_ON : SEG_OFF
                )}
              >
                {t(`stats.view.${v}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div key={`${effectiveView}-${dim}`} className="mb-8 animate-fade-in">
        {effectiveView === 'map' ? (
          <LoadErrorBoundary compact>
            <Suspense fallback={<StatsMapSkeleton />}>
              <StatsMap rows={mapRows(plates.byRegion, 'stolen')} />
            </Suspense>
          </LoadErrorBoundary>
        ) : (
          <WantedStatsTable
            rows={withFoundPercent(rows)}
            dimension={dim}
            labelHeader={t(`wanted.stats.plates.dimension.${dim}`)}
            totalHeader={t('wanted.stats.plates.col.total')}
            defaultSortKey="stolen"
            hideFound={summary.resolvedTotal === 0}
          />
        )}
      </div>

      <Card className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">{t('wanted.stats.plates.recent')}</h2>
        <WantedPlatesRecentList plates={plates.recent ?? []} />
      </Card>

      <p className="mb-6 text-xs text-[var(--color-muted)]">{t('wanted.stats.plates.source')}</p>
    </>
  )
}
