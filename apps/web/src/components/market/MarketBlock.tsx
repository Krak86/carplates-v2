import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { MarketCard } from '@carplates/shared'

import SectionInfo from '@/components/SectionInfo'
import { useCarHeroImageActions } from '@/components/use-car-hero-image-actions'
import { MARKET_VISIBLE, seenDay } from './helpers'
import MarketCardTile from './MarketCardTile'
import MarketModal from './MarketModal'
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
 */
export default function MarketBlock({ view, brandName, brand, model, kind, year }: Props): ReactNode {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<MarketCard | null>(null)
  // The model photo is the same query as the plate card's hero (shared cache); key null = no background override.
  const { query: hero } = useCarHeroImageActions({ brand, model, year: year ?? null, key: null })
  const fallback = hero.data?.image ?? null
  const cards = expanded ? view.cards : view.cards.slice(0, MARKET_VISIBLE)
  const hidden = view.cards.length - cards.length
  const fetched = seenDay(view.fetchedAt)
  const infoTitle = t('market.title')

  return (
    <div className="mb-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/20 px-2.5 py-0.5 text-sm font-medium">
          <span aria-hidden>🏷️</span> {infoTitle}
        </span>
        <span className={chip}>{t(view.dataset === 'ua' ? 'market.chip.ua' : 'market.chip.eu')}</span>
        <span className={chip}>{t('market.chip.via')}</span>
        <span className={chip}>{t('market.chip.prices')}</span>
        <SectionInfo section="market" title={infoTitle} />
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
            onOpen={setSelected}
          />
        ))}
      </ul>

      {(hidden > 0 || expanded) && view.cards.length > MARKET_VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded(open => !open)}
          className="mb-1 text-sm text-primary underline"
        >
          {expanded ? t('market.showLess') : t('market.showMore', { count: hidden })}
        </button>
      )}

      <p className="text-xs text-muted">
        {t('market.attribution', { source: t('market.sources') })}
        {fetched ? ` · ${t('market.updated', { date: fetched })}` : ''}
        {view.stale ? ` · ${t('market.stale')}` : ''}
        {view.budget ? ` · ${t('market.budget', { used: view.budget.used, limit: view.budget.limit })}` : ''}
      </p>

      {selected && (
        <MarketModal
          card={selected}
          title={[brandName, model, selected.year].filter(Boolean).join(' ')}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
