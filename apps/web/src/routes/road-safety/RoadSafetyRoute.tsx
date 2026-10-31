import { lazy } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import LazySection from '@/components/LazySection'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import RelatedPages from '@/components/RelatedPages'
import SectionInfo from '@/components/SectionInfo'
import Card from '@/components/ui/Card'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { roadSafetyRegionsQuery } from '@/lib/queries'
import { parseYearParam, partialMonth } from '@/routes/road-safety/helpers'
import FactsSection from '@/routes/road-safety/FactsSection'
import FleetCorrelation from '@/routes/road-safety/FleetCorrelation'
import RegionMap from '@/routes/road-safety/RegionMap'
import RegionRanking from '@/routes/road-safety/RegionRanking'
import SectionSkeleton from '@/routes/road-safety/SectionSkeleton'
import SourceData from '@/routes/road-safety/SourceData'
import StatsSkeleton from '@/routes/stats/StatsSkeleton'

const RoadsSection = lazy(() => import('@/routes/road-safety/RoadsSection'))
const CausesSection = lazy(() => import('@/routes/road-safety/CausesSection'))
const TimeSection = lazy(() => import('@/routes/road-safety/TimeSection'))
const HazardsSection = lazy(() => import('@/routes/road-safety/HazardsSection'))

const FOOTNOTE_KEYS = ['injuredOnly', 'occupied', 'gaps', 'notPerModel'] as const

// Lazy-loaded (see App.tsx). Online-only: no `offline-cache.ts` entry.
export default function RoadSafetyRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const online = useOnlineStatus()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedYear = parseYearParam(searchParams.get('year'))
  const regions = useQuery(roadSafetyRegionsQuery(requestedYear))
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))

  const data = regions.data

  const handleYearChange = (year: number): void => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      params.set('year', String(year))
      return params
    })
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="inline-block rounded-lg bg-[var(--color-bg)]/85 px-3 py-1.5 text-2xl font-bold backdrop-blur-sm">
          {t('roadSafety.title')}
        </h1>

        <SectionInfo section="roadSafety" title={t('roadSafety.title')} />
      </div>

      {!online && (
        <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-300">
          {t('offline.needsConnection')}
        </p>
      )}

      {regions.isPending && regions.fetchStatus !== 'paused' && <StatsSkeleton variant="rating" />}

      {regions.isError && <p className="text-[var(--color-muted)]">{t('result.error')}</p>}

      {data && (
        <>
          <SourceData data={data} />

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-[var(--color-muted)]">{t('roadSafety.year')}</span>

            <div className="inline-flex flex-wrap gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
              {data.years.map(y => (
                <button
                  key={y.year}
                  type="button"
                  aria-pressed={y.year === data.year}
                  onClick={() => handleYearChange(y.year)}
                  className={cn(
                    'rounded-md border px-3 py-1 text-sm transition-colors duration-200',
                    y.year === data.year
                      ? 'border-transparent bg-[var(--color-bg)] font-medium text-[var(--color-fg)] shadow-sm'
                      : 'border-[var(--color-border)]/50 bg-[var(--color-bg)]/50 text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'
                  )}
                >
                  {y.year}
                  {partialMonth(y) !== null && (
                    <span className="ml-1 text-xs text-[var(--color-muted)]">
                      {t('roadSafety.partial', { month: partialMonth(y) })}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-3">
            <Card>
              <div className="text-xs text-[var(--color-muted)] uppercase">{t('roadSafety.summary.crashes')}</div>
              <div className="text-xl font-semibold tabular-nums">{numberFormat.format(data.national.crashes)}</div>
            </Card>

            <Card>
              <div className="text-xs text-[var(--color-muted)] uppercase">{t('roadSafety.summary.deaths')}</div>
              <div className="text-xl font-semibold tabular-nums">{numberFormat.format(data.national.deaths)}</div>
            </Card>

            <Card>
              <div className="text-xs text-[var(--color-muted)] uppercase">{t('roadSafety.summary.injured')}</div>
              <div className="text-xl font-semibold tabular-nums">{numberFormat.format(data.national.injured)}</div>
            </Card>
          </div>

          <LazySection fallback={<SectionSkeleton />}>
            <RegionMap regions={data.regions} />
          </LazySection>

          <FactsSection regions={data.regions} year={data.year} />

          <RegionRanking regions={data.regions} />

          <FleetCorrelation regions={data.regions} />

          <LazySection fallback={<SectionSkeleton />}>
            <LoadErrorBoundary compact>
              <RoadsSection year={requestedYear} />
            </LoadErrorBoundary>
          </LazySection>

          <LazySection fallback={<SectionSkeleton />}>
            <LoadErrorBoundary compact>
              <CausesSection year={requestedYear} />
            </LoadErrorBoundary>
          </LazySection>

          <LazySection fallback={<SectionSkeleton />}>
            <LoadErrorBoundary compact>
              <TimeSection year={requestedYear} />
            </LoadErrorBoundary>
          </LazySection>

          <LazySection fallback={<SectionSkeleton />}>
            <LoadErrorBoundary compact>
              <HazardsSection year={requestedYear} regionNames={data.regions.map(r => r.region).toSorted()} />
            </LoadErrorBoundary>
          </LazySection>

          <RelatedPages page="roadSafety" />

          <Card className="mb-6">
            <h2 className="mb-2 text-base font-semibold">{t('roadSafety.footnotes.title')}</h2>

            <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-muted)]">
              {FOOTNOTE_KEYS.map(key => (
                <li key={key}>{t(`roadSafety.footnotes.${key}`)}</li>
              ))}
            </ul>

            <p className="mt-3 text-xs text-[var(--color-muted)]">{t('roadSafety.sources')}</p>
          </Card>
        </>
      )}
    </div>
  )
}
