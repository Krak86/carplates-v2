import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { MarketCard } from '@carplates/shared'

import SectionInfo from '@/components/SectionInfo'
import { useCarHeroImageActions } from '@/components/use-car-hero-image-actions'
import { MARKET_CURRENCIES, MARKET_VISIBLE, nextMarketCurrency, seenDay } from './helpers'
import MarketCardTile from './MarketCardTile'
import MarketListModal from './MarketListModal'
import MarketModal from './MarketModal'
import { useMarketCurrency } from './use-market-currency'
import type { MarketView } from './types'

type Props = {
  view: MarketView
  /** Display name of the make (the title of the modal). */
  brandName: string
  /** Raw registry names, as the photo lookup and the API take them. */
  brand: string
  model: string
  kind: string | null | undefined
  year: number | null | undefined
}

const chip = 'inline-flex items-center rounded-full border border-border bg-surface/20 px-2.5 py-0.5 text-xs'

/**
 * "Cars for sale" at the top of Cars in stock: real listings of the make + model delivered by CarAPIS (Ukraine first,
 * Europe when Ukraine has too few). Asking prices, shown to our own users only; every card names its source.
 * A strip of the first cards; the header button and "Show more" open the full list in a modal (grid / rows / table).
 */
export default function MarketBlock({ view, brandName, brand, model, kind, year }: Props): ReactNode {
  const { t } = useTranslation()
  const [listOpen, setListOpen] = useState(false)
  const [selected, setSelected] = useState<MarketCard | null>(null)
  const money = useMarketCurrency(listOpen)
  // The model photo is the same query as the plate card's hero (shared cache); key null = no background override.
  const { query: hero } = useCarHeroImageActions({ brand, model, year: year ?? null, key: null })
  const fallback = hero.data?.image ?? null
  const cards = view.cards.slice(0, MARKET_VISIBLE)
  const hidden = view.cards.length - cards.length
  const fetched = seenDay(view.fetchedAt)
  const infoTitle = t('market.title')
  const carTitle = (card: MarketCard): string => [brandName, model, card.year].filter(Boolean).join(' ')

  const attribution = (
    <p className="text-xs text-muted">
      {t('market.attribution', { source: t('market.sources') })}
      {fetched ? ` · ${t('market.updated', { date: fetched })}` : ''}
      {view.stale ? ` · ${t('market.stale')}` : ''}
      {view.budget ? ` · ${t('market.budget', { used: view.budget.used, limit: view.budget.limit })}` : ''}
    </p>
  )

  return (
    <div className="mb-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/20 px-2.5 py-0.5 text-sm font-medium">
          <span aria-hidden>🏷️</span> {infoTitle}
        </span>
        <span className={chip}>{t(view.dataset === 'ua' ? 'market.chip.ua' : 'market.chip.eu')}</span>
        <span className={chip}>{t('market.chip.via')}</span>
        <button
          type="button"
          onClick={() => money.setWanted(nextMarketCurrency(money.wanted))}
          title={t('market.chip.currencyHint', { list: MARKET_CURRENCIES.join(' / ') })}
          className={`${chip} cursor-pointer hover:bg-surface/60`}
        >
          {t('market.chip.prices', { currency: money.shown })}
        </button>
        <SectionInfo section="market" title={infoTitle} />
        <button
          type="button"
          onClick={() => setListOpen(true)}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-surface/20 px-3 py-0.5 text-sm text-primary hover:bg-surface/60"
        >
          <span aria-hidden>⤢</span> {t('market.openList')}
        </button>
      </div>

      {view.dataset === 'eu' && <p className="mb-2 text-sm text-muted">{t('market.euNote')}</p>}

      <ul className="flex gap-3 overflow-x-auto pb-2">
        {cards.map(card => (
          <MarketCardTile
            key={card.id}
            card={card}
            brand={brand}
            model={model}
            kind={kind}
            fallback={fallback}
            money={money}
            onOpen={setSelected}
          />
        ))}
      </ul>

      {hidden > 0 && (
        <button type="button" onClick={() => setListOpen(true)} className="mb-1 text-sm text-primary underline">
          {t('market.showMore', { count: hidden })} <span aria-hidden>⤢</span>
        </button>
      )}

      {attribution}

      {listOpen && (
        <MarketListModal
          title={`${brandName} ${model} - ${t('market.title')}`}
          cards={view.cards}
          brand={brand}
          model={model}
          kind={kind}
          fallback={fallback}
          money={money}
          detailOpen={!!selected}
          footer={attribution}
          onOpen={setSelected}
          onClose={() => setListOpen(false)}
        />
      )}

      {selected && (
        <MarketModal card={selected} title={carTitle(selected)} money={money} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
