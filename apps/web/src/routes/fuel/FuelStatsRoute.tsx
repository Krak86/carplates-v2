import { useState } from 'react'
import type { ReactNode } from 'react'
import { FUEL_CLASSES } from '@carplates/shared'
import type { FuelStatsRow } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { CO2_BAND_COLOR } from '@/components/CO2Badge.helpers'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { fuelStatsQuery } from '@/lib/queries'
import FuelBarList from '@/routes/fuel/FuelBarList'
import FuelModelsPanel from '@/routes/fuel/FuelModelsPanel'
import { bandForCo2, plausibleYear } from '@/routes/fuel/helpers'

const FUEL_TABS = ['year', 'brand', 'fuelClass'] as const
type FuelTab = (typeof FUEL_TABS)[number]
const DEFAULT_FUEL_TAB: FuelTab = 'year'

/** Years drawn on the by-year chart: recent enough to have emissions data, and real model years. */
const FIRST_CHART_YEAR = 1990

// Lazy-loaded (see App.tsx).
export default function FuelStatsRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const online = useOnlineStatus()
  const stats = useQuery(fuelStatsQuery())
  const [tab, setTab] = useState<FuelTab>(DEFAULT_FUEL_TAB)
  const numberFormat = new Intl.NumberFormat(toIntlLocale(i18n.language))
  const currentYear = new Date().getFullYear()

  const data = stats.data
  const coverage = data && data.total > 0 ? Math.round((data.matched / data.total) * 100) : 0

  const rowsFor = (d: NonNullable<typeof data>): { rows: FuelStatsRow[]; formatLabel?: (label: string) => string } => {
    if (tab === 'year') {
      return {
        rows: d.byYear.filter(r => plausibleYear(r.label, currentYear) && Number(r.label) >= FIRST_CHART_YEAR).reverse()
      }
    }
    if (tab === 'brand') return { rows: d.byBrand }
    const order = new Map<string, number>(FUEL_CLASSES.map((c, i) => [c, i]))
    return {
      rows: [...d.byFuelClass].sort((a, b) => (order.get(a.label) ?? 99) - (order.get(b.label) ?? 99)),
      formatLabel: label => t(`fuel.fuelClass.${label}`)
    }
  }

  const maxBand = data ? Math.max(...data.distribution.map(b => b.n), 1) : 1

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="mb-4 inline-block rounded-lg bg-[var(--color-bg)]/85 px-3 py-1.5 text-2xl font-bold backdrop-blur-sm">
        {t('fuel.title')}
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
              <div className="text-xs text-[var(--color-muted)] uppercase">{t('fuel.summary.fleetAvg')}</div>
              <div
                className="text-xl font-semibold"
                style={data.fleetAvgCo2 != null ? { color: CO2_BAND_COLOR[bandForCo2(data.fleetAvgCo2)] } : undefined}
              >
                {data.fleetAvgCo2 != null ? Math.round(data.fleetAvgCo2) : '—'} {t('co2.unitGKm')}
              </div>
            </Card>
            <Card>
              <div className="text-xs text-[var(--color-muted)] uppercase">{t('fuel.summary.coverage')}</div>
              <div className="text-xl font-semibold">{coverage}%</div>
            </Card>
            <Card className="col-span-2 sm:col-span-1">
              <div className="text-xs text-[var(--color-muted)] uppercase">{t('fuel.summary.cars')}</div>
              <div className="text-xl font-semibold">{numberFormat.format(data.total)}</div>
            </Card>
          </div>

          <div className="mb-3 inline-flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
            {FUEL_TABS.map(value => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn(
                  'rounded-md border px-3 py-1 text-sm transition-colors duration-200',
                  value === tab
                    ? 'border-transparent bg-[var(--color-bg)] font-medium text-[var(--color-fg)] shadow-sm'
                    : 'border-[var(--color-border)]/50 bg-[var(--color-bg)]/50 text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'
                )}
              >
                {t(`fuel.tab.${value}`)}
              </button>
            ))}
          </div>

          <Card className="mb-6">
            <p className="mb-3 text-xs text-[var(--color-muted)]">{t('fuel.note')}</p>
            <div key={tab} className="animate-fade-in">
              <FuelBarList {...rowsFor(data)} />
            </div>
          </Card>

          <FuelModelsPanel stats={data} />

          <Card>
            <h2 className="mb-3 text-base font-semibold">{t('fuel.distribution')}</h2>
            <div className="flex h-32 items-end gap-0.5" role="img" aria-label={t('fuel.distribution')}>
              {data.distribution.map(b => (
                <div
                  key={b.from}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${(b.n / maxBand) * 100}%`,
                    background: CO2_BAND_COLOR[bandForCo2(b.from + data.bandWidth / 2)]
                  }}
                  title={`${b.from}–${b.from + data.bandWidth} ${t('co2.unitGKm')}: ${numberFormat.format(b.n)}`}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-[var(--color-muted)]">
              <span>{data.distribution[0]?.from ?? 0}</span>
              <span>{t('co2.unitGKm')}</span>
              <span>{(data.distribution.at(-1)?.from ?? 0) + data.bandWidth}</span>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
