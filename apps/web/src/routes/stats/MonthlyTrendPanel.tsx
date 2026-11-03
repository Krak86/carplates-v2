import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import SectionInfo from '@/components/SectionInfo'
import Card from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { monthlyStatsQuery } from '@/lib/queries'
import {
  DEFAULT_TREND_FILTER,
  TREND_FILTERS,
  monthAxisLabel,
  niceMax,
  trendPoints
} from '@/routes/stats/MonthlyTrendPanel.helpers'
import type { TrendFilter } from '@/routes/stats/MonthlyTrendPanel.helpers'

const WIDTH = 640
const HEIGHT = 250
const PAD = { left: 52, right: 8, top: 10, bottom: 26 }

/** "2026-08" -> "2025-08": the same month a year earlier. */
function yearEarlier(month: string): string {
  return month.replace(/^\d{4}/, y => String(Number(y) - 1))
}

/**
 * Registry operations per month for the latest 12 months (bars) against the same months a year earlier (line), filterable
 * to new vehicles, used imports or resales. Plain SVG, no chart library. Online-only; renders nothing before the
 * `stats_by_month` rollup is built (`db:refresh-stats`).
 */
export default function MonthlyTrendPanel(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data } = useQuery(monthlyStatsQuery())
  const [filter, setFilter] = useState<TrendFilter>(DEFAULT_TREND_FILTER)
  if (!data || data.months.length === 0) return null

  const locale = toIntlLocale(i18n.language)
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 0 })
  const full = new Intl.NumberFormat(locale)
  const points = trendPoints(data.months, filter)
  const max = niceMax(points.reduce((m, p) => Math.max(m, p.value, p.previous ?? 0), 0))
  const innerW = WIDTH - PAD.left - PAD.right
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const slot = innerW / points.length
  const barW = slot * 0.62
  const y = (v: number): number => PAD.top + innerH - (v / max) * innerH
  const x = (i: number): number => PAD.left + slot * i + slot / 2
  const linePoints = points.flatMap((p, i) => (p.previous === null ? [] : [`${x(i)},${y(p.previous)}`]))
  const ticks = [0, max / 2, max]

  return (
    <Card className="mb-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{t('stats.trend.title')}</h2>

        <SectionInfo section="statsTrend" title={t('stats.trend.title')} />

        <div role="group" className="ml-auto flex flex-wrap gap-1">
          {TREND_FILTERS.map(f => (
            <button
              key={f}
              type="button"
              aria-pressed={f === filter}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full border px-3 py-1 text-sm transition-colors duration-200',
                f === filter
                  ? 'border-transparent bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-fg)]'
              )}
            >
              {t(`stats.trend.filter.${f}`)}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={t('stats.trend.title')}>
        {ticks.map(v => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--color-border)"
              strokeDasharray="3 4"
            />
            <text
              x={PAD.left - 6}
              y={y(v)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="11"
              fill="var(--color-muted)"
            >
              {compact.format(v)}
            </text>
          </g>
        ))}

        {points.map((p, i) => (
          <g key={p.month}>
            <title>
              {`${monthAxisLabel(p.month)}: ${full.format(p.value)}`}
              {p.previous !== null && ` (${monthAxisLabel(yearEarlier(p.month))}: ${full.format(p.previous)})`}
            </title>
            <rect
              x={x(i) - barW / 2}
              y={y(p.value)}
              width={barW}
              height={PAD.top + innerH - y(p.value)}
              rx="3"
              fill="var(--age-0)"
              opacity="0.9"
            />
            {i % 3 === (points.length - 1) % 3 && (
              <text x={x(i)} y={HEIGHT - 8} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
                {monthAxisLabel(p.month)}
              </text>
            )}
          </g>
        ))}

        {linePoints.length > 1 && (
          <polyline
            points={linePoints.join(' ')}
            fill="none"
            stroke="var(--age-3)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}
        {points.map((p, i) =>
          p.previous === null ? null : <circle key={p.month} cx={x(i)} cy={y(p.previous)} r="3" fill="var(--age-3)" />
        )}
      </svg>

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
