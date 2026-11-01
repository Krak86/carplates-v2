import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { STOCK_RANGES } from '@carplates/shared'
import type { StockRange, StockResponse } from '@carplates/shared'

import StockChart from '@/components/StockChart'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'

type Props = {
  data: StockResponse
  range: StockRange
  onRangeChange: (range: StockRange) => void
  tall?: boolean
}

/** Price, change, sparkline, range tabs and the Yahoo Finance link: the body shared by the side widget and the section. */
export default function StockQuote({ data, range, onRangeChange, tall }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const company = data.company
  if (!company || data.points.length < 2) return null

  const money = (n: number): string =>
    new Intl.NumberFormat(toIntlLocale(i18n.language), {
      style: 'currency',
      currency: data.currency ?? 'USD',
      maximumFractionDigits: n >= 1000 ? 0 : 2
    }).format(n)
  const price = data.price ?? data.points[data.points.length - 1]![1]
  const change = data.baseline != null ? price - data.baseline : 0
  const changePct = data.baseline ? (change / data.baseline) * 100 : 0
  const up = change >= 0

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-2 px-1">
        <span className="text-lg font-semibold tabular-nums">{money(price)}</span>

        {data.baseline != null && (
          <span className={cn('text-xs font-medium tabular-nums', up ? 'text-green-600' : 'text-red-500')}>
            {up ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
          </span>
        )}
      </div>

      <StockChart points={data.points} baseline={range === '1d' ? data.baseline : null} up={up} tall={tall} />

      <div className="flex items-center justify-between gap-1">
        <div className="flex gap-1">
          {STOCK_RANGES.map(r => (
            <button
              key={r}
              type="button"
              aria-pressed={r === range}
              onClick={() => onRangeChange(r)}
              className={cn(
                'rounded-md px-2 py-0.5 text-xs font-medium',
                r === range
                  ? 'bg-[var(--color-surface)] text-[var(--color-fg)]'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-surface)]'
              )}
            >
              {t(`stock.range.${r}`)}
            </button>
          ))}
        </div>

        <a
          href={company.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md px-1.5 py-0.5 text-xs text-[var(--color-primary)] hover:bg-[var(--color-surface)]"
        >
          {company.symbol} <span aria-hidden>↗</span>
        </a>
      </div>
    </>
  )
}
