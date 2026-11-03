import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import ColumnChart from '@/components/charts/ColumnChart'
import SectionInfo from '@/components/SectionInfo'
import Card from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { monthlyStatsQuery } from '@/lib/queries'
import {
  DEFAULT_TREND_FILTER,
  DEFAULT_TREND_SCOPE,
  TREND_FILTERS,
  TREND_SCOPES,
  hasCarSplit,
  monthAxisLabel,
  trendPoints,
  yearEarlier
} from '@/routes/stats/MonthlyTrendPanel.helpers'
import type { TrendFilter, TrendScope } from '@/routes/stats/MonthlyTrendPanel.helpers'

function chipClass(active: boolean): string {
  return cn(
    'rounded-full border px-3 py-1 text-sm transition-colors duration-200',
    active
      ? 'border-transparent bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-fg)]'
  )
}

/**
 * Registry operations per month for the latest 12 months (bars) against the same months a year earlier (line), filterable
 * to passenger cars or all vehicles and to new vehicles, used imports or resales. Online-only; renders nothing before the
 * `stats_by_month` rollup is built (`db:refresh-stats`).
 */
export default function MonthlyTrendPanel(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data } = useQuery(monthlyStatsQuery())
  const [filter, setFilter] = useState<TrendFilter>(DEFAULT_TREND_FILTER)
  const [scope, setScope] = useState<TrendScope>(DEFAULT_TREND_SCOPE)
  if (!data || data.months.length === 0) return null

  const locale = toIntlLocale(i18n.language)
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 0 })
  const full = new Intl.NumberFormat(locale)
  const split = hasCarSplit(data.months)
  const columns = trendPoints(data.months, filter, split ? scope : 'all').map(p => ({
    key: p.month,
    label: monthAxisLabel(p.month),
    value: p.value,
    secondary: p.previous,
    title:
      `${monthAxisLabel(p.month)}: ${full.format(p.value)}` +
      (p.previous !== null ? ` (${monthAxisLabel(yearEarlier(p.month))}: ${full.format(p.previous)})` : '')
  }))

  return (
    <Card className="mb-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{t('stats.trend.title')}</h2>

        <SectionInfo section="statsTrend" title={t('stats.trend.title')} />

        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          {split && (
            <div role="group" aria-label={t('stats.trend.scope.label')} className="flex flex-wrap gap-1">
              {TREND_SCOPES.map(s => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={s === scope}
                  onClick={() => setScope(s)}
                  className={chipClass(s === scope)}
                >
                  {t(`stats.trend.scope.${s}`)}
                </button>
              ))}
            </div>
          )}

          <div role="group" className="flex flex-wrap gap-1">
            {TREND_FILTERS.map(f => (
              <button
                key={f}
                type="button"
                aria-pressed={f === filter}
                onClick={() => setFilter(f)}
                className={chipClass(f === filter)}
              >
                {t(`stats.trend.filter.${f}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ColumnChart
        columns={columns}
        ariaLabel={t('stats.trend.title')}
        formatTick={v => compact.format(v)}
        labelEvery={3}
      />

      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[var(--color-muted)]">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-3 rounded-sm" style={{ backgroundColor: 'var(--age-0)' }} />
          {t('stats.trend.legend.current')}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-4" style={{ backgroundColor: 'var(--age-3)' }} />
          {t('stats.trend.legend.previous')}
        </span>
      </div>
    </Card>
  )
}
