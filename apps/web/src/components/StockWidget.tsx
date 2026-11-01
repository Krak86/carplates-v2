import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { DEFAULT_STOCK_RANGE } from '@carplates/shared'
import type { StockRange } from '@carplates/shared'

import StockQuote from '@/components/StockQuote'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SIDE_WIDGETS_DESKTOP_QUERY } from '@/hooks/useSideWidgetsVisible'
import { cn } from '@/lib/cn'
import { stockQuery } from '@/lib/queries'

type Props = {
  brand: string
}

/**
 * Left-hand share-price panel on a result: the listed company behind the car's make (the make itself, or its parent
 * group). Same UX as the Bluesky / news panels — desktop only, renders nothing for an unlisted make, fades in from the
 * left once the user starts scrolling, dismissible per route. Stacked by the parent column, so it sits under Bluesky
 * when both show and on top when only this one does. The same quote is also a collapsed "Share price" section
 * (`SharePriceSection`) for phones and the catalog pages.
 */
export default function StockWidget({ brand }: Props): ReactNode {
  const { t } = useTranslation()
  const isDesktop = useMediaQuery(SIDE_WIDGETS_DESKTOP_QUERY)
  const { pathname } = useLocation()
  const [dismissedPath, setDismissedPath] = useState<string | null>(null)
  const [range, setRange] = useState<StockRange>(DEFAULT_STOCK_RANGE)
  const stock = useQuery({ ...stockQuery(brand, range), enabled: isDesktop, placeholderData: prev => prev })

  const data = stock.data
  const company = data?.company
  if (!isDesktop || !data || !company || data.points.length < 2 || dismissedPath === pathname) return null

  return (
    <aside
      aria-label={t('stock.title')}
      className={cn(
        'flex w-full flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3 backdrop-blur-md',
        'transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none',
        // Mounted only after the delay (see useSideWidgetsVisible), so it slides in on insertion.
        'starting:-translate-x-8 starting:opacity-0',
        'pointer-events-auto translate-x-0 opacity-100'
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

      <StockQuote data={data} range={range} onRangeChange={setRange} />
    </aside>
  )
}
