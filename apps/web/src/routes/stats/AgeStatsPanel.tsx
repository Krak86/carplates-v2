import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import SectionInfo from '@/components/SectionInfo'
import Card from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { originStatsQuery } from '@/lib/queries'
import { AGE_VALUE_MODES, DEFAULT_AGE_VALUE_MODE, ageBars } from '@/routes/stats/AgeStatsPanel.helpers'
import type { AgeValueMode } from '@/routes/stats/AgeStatsPanel.helpers'

/**
 * Passenger cars by age (new, 1-5, 6-10, 11-20, 21+ years) as horizontal bars, with a share / count toggle. Built from the
 * origin rollup's model-year counts, so it shares its query and renders nothing before that rollup exists (or on an API
 * that predates `byMakeYear`).
 */
export default function AgeStatsPanel(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data } = useQuery(originStatsQuery())
  const [mode, setMode] = useState<AgeValueMode>(DEFAULT_AGE_VALUE_MODE)
  if (!data?.byMakeYear || data.total === 0) return null

  const locale = toIntlLocale(i18n.language)
  const numberFormat = new Intl.NumberFormat(locale)
  const percentFormat = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 })
  const { bars, unknown, total } = ageBars(data.byMakeYear, new Date().getFullYear())
  const maxValue = bars.reduce((max, b) => Math.max(max, mode === 'share' ? b.share : b.n), 0)

  return (
    <Card className="mb-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{t('stats.age.title')}</h2>

        <SectionInfo section="statsAge" title={t('stats.age.title')} />

        <div className="ml-auto inline-flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
          {AGE_VALUE_MODES.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={m === mode}
              className={cn(
                'rounded-md border px-3 py-1 text-sm transition-colors duration-200',
                m === mode
                  ? 'border-transparent bg-[var(--color-bg)] font-medium text-[var(--color-fg)] shadow-sm'
                  : 'border-[var(--color-border)]/50 bg-[var(--color-bg)]/50 text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'
              )}
            >
              {t(`stats.age.mode.${m}`)}
            </button>
          ))}
        </div>
      </div>

      <ol className="space-y-2 text-sm">
        {bars.map(b => {
          const value = mode === 'share' ? b.share : b.n
          return (
            <li key={b.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 sm:w-28">{t(`stats.age.bucket.${b.key}`)}</span>

              <div className="h-7 min-w-0 flex-1" aria-hidden>
                <div
                  className="h-full rounded-md transition-[width] duration-500"
                  style={{ width: `${maxValue > 0 ? (value / maxValue) * 100 : 0}%`, backgroundColor: b.colorVar }}
                />
              </div>

              <span className="w-20 shrink-0 text-right font-medium tabular-nums">
                {mode === 'share' ? percentFormat.format(b.share) : numberFormat.format(b.n)}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="mt-3 text-xs text-[var(--color-muted)]">
        {t('stats.age.total', { count: total, formatted: numberFormat.format(total) })}
        {unknown > 0 && ` ${t('stats.age.unknown')}: ${numberFormat.format(unknown)}.`}
      </p>
    </Card>
  )
}
