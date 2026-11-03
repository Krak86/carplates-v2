import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { MarketCard, WikiImage } from '@carplates/shared'

import AuctionCurrency from '@/components/ua-auctions/AuctionCurrency'
import { cn } from '@/lib/cn'
import {
  DEFAULT_MARKET_LAYOUT,
  DEFAULT_MARKET_SORT,
  MARKET_SORTS,
  MARKET_VIEWS,
  orderCards,
  type MarketLayout,
  type MarketSort
} from './helpers'
import MarketCardTile from './MarketCardTile'
import MarketRowItem from './MarketRowItem'
import MarketTable from './MarketTable'
import type { MarketCurrency } from './use-market-currency'
import { useEscape } from './use-escape'

type Props = {
  title: string
  cards: readonly MarketCard[]
  brand: string
  model: string
  kind: string | null | undefined
  fallback: WikiImage | null
  money: MarketCurrency
  /** A detail modal is open above: Escape then closes only that one. */
  detailOpen: boolean
  /** The block's chips and attribution line, repeated at the bottom so the source stays visible in the modal. */
  footer: ReactNode
  onOpen: (card: MarketCard) => void
  onClose: () => void
}

const LAYOUT_KEY = 'market-layout'
const LAYOUT_ICON: Record<MarketLayout, string> = { grid: '▦', rows: '☰', table: '▤' }

function readLayout(): MarketLayout {
  try {
    const value = localStorage.getItem(LAYOUT_KEY)
    return (MARKET_VIEWS as readonly string[]).includes(value ?? '') ? (value as MarketLayout) : DEFAULT_MARKET_LAYOUT
  } catch {
    return DEFAULT_MARKET_LAYOUT
  }
}

/**
 * Full list of the listings in a large modal (portaled, like the detail one): grid / rows / table layouts, a sort order and
 * the currency switch. Everything is already loaded, so opening it costs no CarAPIS request. The layout is remembered.
 */
export default function MarketListModal({
  title,
  cards,
  brand,
  model,
  kind,
  fallback,
  money,
  detailOpen,
  footer,
  onOpen,
  onClose
}: Props): ReactNode {
  const { t } = useTranslation()
  const [layout, setLayoutState] = useState<MarketLayout>(readLayout)
  const [sort, setSort] = useState<MarketSort>(DEFAULT_MARKET_SORT)
  useEscape(onClose, !detailOpen)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const setLayout = (next: MarketLayout): void => {
    setLayoutState(next)
    try {
      localStorage.setItem(LAYOUT_KEY, next)
    } catch {
      // private mode: lasts until reload
    }
  }

  const ordered = orderCards(cards, sort)
  const shared = { brand, model, kind, fallback, money, onOpen }

  return createPortal(
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-2 sm:p-4"
      role="dialog"
      aria-modal
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[56rem] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-surface"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-3 sm:p-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted">{t('market.listCount', { count: cards.length })}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('market.close')}
            className="shrink-0 text-lg text-muted hover:text-fg"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-3 py-2 sm:px-4">
          <div
            role="group"
            aria-label={t('market.view.label')}
            className="inline-flex overflow-hidden rounded-full border border-border"
          >
            {MARKET_VIEWS.map(view => (
              <button
                key={view}
                type="button"
                aria-pressed={view === layout}
                onClick={() => setLayout(view)}
                className={cn(
                  'px-3 py-1 text-sm transition-colors',
                  view === layout ? 'bg-emerald-500/30 text-fg' : 'hover:bg-border/50'
                )}
              >
                <span aria-hidden>{LAYOUT_ICON[view]}</span> {t(`market.view.${view}`)}
              </button>
            ))}
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-muted">
            {t('market.sort.label')}
            <select
              value={sort}
              onChange={e => setSort(e.target.value as MarketSort)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-fg"
            >
              {MARKET_SORTS.map(option => (
                <option key={option} value={option}>
                  {t(`market.sort.${option}`)}
                </option>
              ))}
            </select>
          </label>

          <AuctionCurrency currency={money.wanted} onChange={money.setWanted} fx={money.rates} baseCurrency="USD" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {layout === 'grid' && (
            <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {ordered.map(card => (
                <MarketCardTile key={card.id} card={card} className="w-full" {...shared} />
              ))}
            </ul>
          )}
          {layout === 'rows' && (
            <ul className="space-y-2">
              {ordered.map(card => (
                <MarketRowItem key={card.id} card={card} {...shared} />
              ))}
            </ul>
          )}
          {layout === 'table' && <MarketTable cards={ordered} money={money} onOpen={onOpen} />}
        </div>

        <div className="border-t border-border px-3 py-2 sm:px-4">{footer}</div>
      </div>
    </div>,
    document.body
  )
}
