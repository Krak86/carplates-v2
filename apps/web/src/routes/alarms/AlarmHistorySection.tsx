import { Suspense, lazy, useState } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_ALARM_HISTORY_SOURCE } from '@carplates/shared'
import type { AlarmHistorySource } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { alarmHistoryQuery, roadSafetyRegionsQuery } from '@/lib/queries'
import HistoryTable from '@/routes/alarms/HistoryTable'
import {
  DEFAULT_HISTORY_MAP_METRIC,
  HISTORY_MAP_METRICS,
  estimatedShare,
  historyMapRows,
  historyTotals,
  joinHistory,
  sortByTimeUnderAlert
} from '@/routes/alarms/history-helpers'
import type { HistoryMapMetric } from '@/routes/alarms/history-helpers'
import SegmentedTabs from '@/routes/road-safety/SegmentedTabs'
import { parseYearParam } from '@/routes/road-safety/helpers'
import StatsMapSkeleton from '@/routes/stats/StatsMapSkeleton'

// The same choropleth as /stats and /road-safety (its attribution line is part of the map).
const StatsMap = lazy(() => import('@/routes/stats/StatsMap'))

const SOURCES = ['official', 'volunteer'] as const satisfies readonly AlarmHistorySource[]
const FOOTNOTE_KEYS = ['threat', 'noScore', 'missing', 'counting', 'crashes'] as const

/**
 * Time under alert per oblast and year next to road crashes of the same year. Honesty rules: a siren is a threat, not a strike
 * ("most time under alert", never "most bombed"); no combined safer / less safe score; official and volunteer data are never mixed.
 */
export default function AlarmHistorySection(): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const [searchParams, setSearchParams] = useSearchParams()
  const [source, setSource] = useState<AlarmHistorySource>(DEFAULT_ALARM_HISTORY_SOURCE)
  const [metric, setMetric] = useState<HistoryMapMetric>(DEFAULT_HISTORY_MAP_METRIC)

  const history = useQuery(alarmHistoryQuery(parseYearParam(searchParams.get('year'))))
  const data = history.data
  const crashes = useQuery({ ...roadSafetyRegionsQuery(data?.year), enabled: !!data })
  // keepPreviousData keeps the last year's answer while a new one loads: never join it with another year's alerts.
  const crashData = crashes.data?.year === data?.year ? crashes.data : undefined

  const handleYearChange = (year: number): void => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev)
      params.set('year', String(year))
      return params
    })
  }

  const own = data?.sources.find(s => s.source === source)
  const rows = own ? sortByTimeUnderAlert(joinHistory(own.regions, crashData?.regions)) : []
  const totals = own ? historyTotals(own.regions) : null
  const share = own && source === 'volunteer' ? estimatedShare(own.regions) : null
  const date = (iso: string): string =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  const numberFormat = new Intl.NumberFormat(locale)

  return (
    <Card className="mb-6">
      <h2 className="mb-1 text-lg font-semibold">{t('alarms.history.title')}</h2>
      <p className="mb-3 text-sm text-[var(--color-muted)]">{t('alarms.history.intro')}</p>

      {history.isPending && <StatsMapSkeleton />}

      {history.isError && <p className="text-[var(--color-muted)]">{t('alarms.history.noData')}</p>}

      {data && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-muted)]">{t('roadSafety.year')}</span>
              <SegmentedTabs
                values={data.years.map(String)}
                value={String(data.year)}
                onChange={value => handleYearChange(Number(value))}
                label={value => value}
              />
            </div>

            <SegmentedTabs
              values={SOURCES}
              value={source}
              onChange={setSource}
              label={value => t(`alarms.history.source.${value}`)}
            />
          </div>

          {!own && <p className="mb-3 text-sm text-[var(--color-muted)]">{t('alarms.history.noSource')}</p>}

          {own && (
            <>
              <p className="mb-1 text-xs text-[var(--color-muted)]">{t(`alarms.history.sourceNote.${source}`)}</p>
              <p className="mb-1 text-xs text-[var(--color-muted)]">
                {t('alarms.history.range', { from: date(own.firstDay), to: date(own.lastDay) })}
              </p>
              {share !== null && (
                <p className="mb-1 text-xs font-medium">
                  {t('alarms.history.estimated', { percent: Math.round(share * 100) })}
                </p>
              )}
              {!!crashes.isError && (
                <p className="mb-1 text-xs text-[var(--color-muted)]">
                  {t('alarms.history.noCrashYear', { year: data.year })}
                </p>
              )}
              {!!crashData && crashData.period < 12 && (
                <p className="mb-1 text-xs text-[var(--color-muted)]">
                  {t('alarms.history.crashPartial', { month: crashData.period })}
                </p>
              )}
              {!!totals && (
                <p className="mb-3 text-sm font-medium">
                  {t('alarms.history.totals', {
                    alerts: numberFormat.format(totals.alerts),
                    hours: numberFormat.format(Math.round(totals.seconds / 3600))
                  })}
                </p>
              )}

              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold">{t('alarms.history.map.title')}</h3>
                <SegmentedTabs
                  values={HISTORY_MAP_METRICS}
                  value={metric}
                  onChange={setMetric}
                  label={value => t(`alarms.history.metric.${value}`)}
                />
              </div>

              <LoadErrorBoundary compact>
                <Suspense fallback={<StatsMapSkeleton />}>
                  <StatsMap rows={historyMapRows(own.regions, metric)} />
                </Suspense>
              </LoadErrorBoundary>

              <h3 className="mt-5 mb-2 text-base font-semibold">{t('alarms.history.table.title')}</h3>
              <HistoryTable rows={rows} hasCrashes={!!crashData} />
            </>
          )}

          <h3 className="mt-5 mb-2 text-base font-semibold">{t('alarms.history.footnotes.title')}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-muted)]">
            {FOOTNOTE_KEYS.map(key => (
              <li key={key}>{t(`alarms.history.footnotes.${key}`)}</li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-[var(--color-muted)]">{t('alarms.history.sources')}</p>
        </>
      )}
    </Card>
  )
}
