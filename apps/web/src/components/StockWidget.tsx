import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { DEFAULT_STOCK_RANGE, STOCK_RANGES } from '@carplates/shared'
import type { StockRange } from '@carplates/shared'

import StockChart from '@/components/StockChart'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SHOW_AFTER_SCROLL_PX, SIDE_WIDGETS_DESKTOP_QUERY } from '@/hooks/useSideWidgetsVisible'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { stockQuery } from '@/lib/queries'

type Props = {
  brand: string
}

/**
 * Left-hand share-price panel on a result: the listed company behind the car's make (the make itself, or its parent
 * group). Same UX as the Bluesky / news panels — desktop only, renders nothing for an unlisted make, fades in from the
 * left once the user starts scrolling, dismissible per route. Stacked by the parent column, so it sits under Bluesky
 * when both show and on top when only this one does.
 */
export default function StockWidget({ brand }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const isDesktop = useMediaQuery(SIDE_WIDGETS_DESKTOP_QUERY)
  const { pathname } = useLocation()
  const [dismissedPath, setDismissedPath] = useState<string | null>(null)
  const [range, setRange] = useState<StockRange>(DEFAULT_STOCK_RANGE)
  const [scrolled, setScrolled] = useState<boolean>(() => window.scrollY > SHOW_AFTER_SCROLL_PX)
  const stock = useQuery({ ...stockQuery(brand, range), enabled: isDesktop, placeholderData: prev => prev })

  useEffect(() => {
    const handleScroll = (): void => setScrolled(window.scrollY > SHOW_AFTER_SCROLL_PX)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return (): void => window.removeEventListener('scroll', handleScroll)
  }, [])

  const data = stock.data
  const company = data?.company
  if (!isDesktop || !data || !company || data.points.length < 2 || dismissedPath === pathname) return null

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
    <aside
      aria-label={t('stock.title')}
      aria-hidden={!scrolled}
      className={cn(
        'flex w-full flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3 backdrop-blur-md',
        'transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none',
        // Mounted only after the first scroll (see useSideWidgetsVisible), so it slides in on insertion.
        'starting:-translate-x-8 starting:opacity-0',
        scrolled ? 'pointer-events-auto translate-x-0 opacity-100' : 'pointer-events-none -translate-x-8 opacity-0'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 truncate px-1 text-sm font-semibold" title={company.name}>
          <span aria-hidden>📈</span> {company.name}
        </h2>

        <button
          type="button"
          aria-label={t('stock.close')}
          title={t('stock.close')}
          onClick={() => setDismissedPath(pathname)}
          className="rounded-md px-1.5 text-lg leading-none text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
        >
          ×
        </button>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2 px-1">
        <span className="text-lg font-semibold tabular-nums">{money(price)}</span>

        {data.baseline != null && (
          <span className={cn('text-xs font-medium tabular-nums', up ? 'text-green-600' : 'text-red-500')}>
            {up ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
          </span>
        )}
      </div>

      <StockChart points={data.points} baseline={range === '1d' ? data.baseline : null} up={up} />

      <div className="flex items-center justify-between gap-1">
        <div className="flex gap-1">
          {STOCK_RANGES.map(r => (
            <button
              key={r}
              type="button"
              aria-pressed={r === range}
              tabIndex={scrolled ? undefined : -1}
              onClick={() => setRange(r)}
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
          tabIndex={scrolled ? undefined : -1}
          className="rounded-md px-1.5 py-0.5 text-xs text-[var(--color-primary)] hover:bg-[var(--color-surface)]"
        >
          {company.symbol} <span aria-hidden>↗</span>
        </a>
      </div>
    </aside>
  )
}
