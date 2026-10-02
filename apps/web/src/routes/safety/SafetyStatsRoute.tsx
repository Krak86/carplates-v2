import type { ReactNode } from 'react'
import type { SafetyStatsRow } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { CO2_BAND_COLOR } from '@/components/CO2Badge.helpers'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { safetyStatsQuery } from '@/lib/queries'
import { plausibleYear } from '@/routes/fuel/helpers'
import SafetyBarList from '@/routes/safety/SafetyBarList'
import SafetyModelsPanel from '@/routes/safety/SafetyModelsPanel'
import { bandForScore } from '@/routes/safety/helpers'

const SAFETY_TABS = ['year', 'brand', 'source'] as const
type SafetyTab = (typeof SAFETY_TABS)[number]
const DEFAULT_SAFETY_TAB: SafetyTab = 'year'

function parseSafetyTab(value: string | null): SafetyTab {
  return (SAFETY_TABS as readonly string[]).includes(value ?? '') ? (value as SafetyTab) : DEFAULT_SAFETY_TAB
}

/** Years drawn on the by-year chart: recent enough to be rated, and real model years. */
const FIRST_CHART_YEAR = 1990

// Lazy-loaded (see App.tsx).
export default function SafetyStatsRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const online = useOnlineStatus()
  const stats = useQuery(safetyStatsQuery())
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseSafetyTab(searchParams.get('tab'))

  const handleTabChange = (next: SafetyTab): void => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      params.set('tab', next)
      return params
    })
  }

  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const currentYear = new Date().getFullYear()

  const data = stats.data
  const coverage = data && data.total > 0 ? Math.round((data.matched / data.total) * 100) : 0

  const rowsFor = (
    d: NonNullable<typeof data>
  ): { rows: SafetyStatsRow[]; formatLabel?: (label: string) => string } => {
    if (tab === 'year') {
      return {
        rows: d.byYear.filter(r => plausibleYear(r.label, currentYear) && Number(r.label) >= FIRST_CHART_YEAR).reverse()
      }
    }
    if (tab === 'brand') return { rows: d.byBrand }
    // Per source: the bar is that source's mean score, "cars · %" is how much of the fleet it covers.
    return {
      rows: d.bySource.map(s => ({ label: s.source, n: d.total, matched: s.matched, avgScore: s.avgScore })),
      formatLabel: label => t(`safety.source.${label}`)
    }
  }

  const maxBand = data ? Math.max(...data.distribution.map(b => b.n), 1) : 1

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="mb-4 inline-block rounded-lg bg-[var(--color-bg)]/85 px-3 py-1.5 text-2xl font-bold backdrop-blur-sm">
        {t('safety.title')}
      </h1>

      {!online && (
        <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-300">
          {t('offline.needsConnection')}
        </p>
      )}

      {stats.isPending && stats.fetchStatus !== 'paused' && (
        <p className="flex items-center gap-2 text-[var(--color-muted)]">
          <Spinner /> {t('result.loading')}
        </p>
      )}

      {stats.isError && <p className="text-[var(--color-muted)]">{t('result.error')}</p>}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card>
              <div className="text-xs text-[var(--color-muted)] uppercase">{t('safety.summary.fleetAvg')}</div>
              <div
                className="text-xl font-semibold"
                style={
                  data.fleetAvgScore != null ? { color: CO2_BAND_COLOR[bandForScore(data.fleetAvgScore)] } : undefined
                }
              >
                {data.fleetAvgScore != null ? Math.round(data.fleetAvgScore) : '—'} {t('safety.scoreUnit')}
              </div>
            </Card>
            <Card>
              <div className="text-xs text-[var(--color-muted)] uppercase">{t('safety.summary.coverage')}</div>
              <div className="text-xl font-semibold">{coverage}%</div>
            </Card>
            <Card className="col-span-2 sm:col-span-1">
              <div className="text-xs text-[var(--color-muted)] uppercase">{t('fuel.summary.cars')}</div>
              <div className="text-xl font-semibold">{numberFormat.format(data.total)}</div>
            </Card>
          </div>

          <div className="mb-3 inline-flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
            {SAFETY_TABS.map(value => (
              <button
                key={value}
                type="button"
                onClick={() => handleTabChange(value)}
                className={cn(
                  'rounded-md border px-3 py-1 text-sm transition-colors duration-200',
                  value === tab
                    ? 'border-transparent bg-[var(--color-bg)] font-medium text-[var(--color-fg)] shadow-sm'
                    : 'border-[var(--color-border)]/50 bg-[var(--color-bg)]/50 text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'
                )}
              >
                {t(`safety.tab.${value}`)}
              </button>
            ))}
          </div>

          <Card className="mb-6">
            <p className="mb-3 text-xs text-[var(--color-muted)]">{t('safety.note')}</p>
            <div key={tab} className="animate-fade-in">
              <SafetyBarList {...rowsFor(data)} />
            </div>
          </Card>

          <SafetyModelsPanel stats={data} />

          <Card>
            <h2 className="mb-3 text-base font-semibold">{t('safety.distribution')}</h2>
            <div className="flex h-32 items-end gap-0.5" role="img" aria-label={t('safety.distribution')}>
              {data.distribution.map(b => (
                <div
                  key={b.from}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${(b.n / maxBand) * 100}%`,
                    background: CO2_BAND_COLOR[bandForScore(b.from + data.bandWidth / 2)]
                  }}
                  title={`${b.from}–${b.from + data.bandWidth}: ${numberFormat.format(b.n)}`}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-[var(--color-muted)]">
              <span>{data.distribution[0]?.from ?? 0}</span>
              <span>{t('safety.scoreUnit')}</span>
              <span>{(data.distribution.at(-1)?.from ?? 0) + data.bandWidth}</span>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
