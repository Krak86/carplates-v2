import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { statsQuery } from '@/lib/queries'
import { dimensionHasYearColumn, dimensionRows } from '@/routes/stats/helpers'
import StatsTable from '@/routes/stats/StatsTable'
import {
  DEFAULT_STATS_DIMENSION,
  DEFAULT_STATS_METRIC,
  STATS_DIMENSIONS,
  STATS_METRICS
} from '@/routes/stats/types'
import type { StatsDimension, StatsMetric } from '@/routes/stats/types'

function parseDimension(value: string | null): StatsDimension {
  return (STATS_DIMENSIONS as readonly string[]).includes(value ?? '') ? (value as StatsDimension) : DEFAULT_STATS_DIMENSION
}

function parseMetric(value: string | null): StatsMetric {
  return (STATS_METRICS as readonly string[]).includes(value ?? '') ? (value as StatsMetric) : DEFAULT_STATS_METRIC
}

// Lazy-loaded (see App.tsx).
export default function StatsRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const stats = useQuery(statsQuery())
  const [searchParams, setSearchParams] = useSearchParams()

  const dim = parseDimension(searchParams.get('dim'))
  const metric = parseMetric(searchParams.get('metric'))

  const handleDimensionChange = (next: StatsDimension): void => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      params.set('dim', next)
      return params
    })
  }

  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="mb-4 text-2xl font-bold">{t('stats.title')}</h1>

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

          <div className="mb-4 flex flex-wrap gap-1">
            {STATS_DIMENSIONS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => handleDimensionChange(d)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm',
                  d === dim
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-surface)]'
                )}
              >
                {t(`stats.dimension.${d}`)}
              </button>
            ))}
          </div>

          <StatsTable
            key={dim}
            rows={dimensionRows(stats.data, dim)}
            labelHeader={t(`stats.dimension.${dim}`)}
            showYearColumn={dimensionHasYearColumn(dim)}
            defaultSortKey={metric}
          />
        </>
      )}
    </div>
  )
}
