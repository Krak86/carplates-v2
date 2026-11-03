import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { MarketCard, WikiImage } from '@carplates/shared'

import { toIntlLocale } from '@/lib/intl'
import { countryFlag, formatOriginalPrice, formatPriceIn, marketFacts, seenDay } from './helpers'
import MarketPhoto from './MarketPhoto'
import type { MarketCurrency } from './use-market-currency'

type Props = {
  card: MarketCard
  brand: string
  model: string
  kind: string | null | undefined
  fallback: WikiImage | null
  money: MarketCurrency
  onOpen: (card: MarketCard) => void
}

/** "Rows" layout: a wide row with a small photo on the left and the facts on the right (reads well on a phone). */
export default function MarketRowItem({ card, brand, model, kind, fallback, money, onOpen }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const price = formatPriceIn(card.priceUsd, money.shown, money.rates, locale)
  const original = formatOriginalPrice(card.priceOriginal, card.currencyOriginal, locale, money.shown)
  const facts = marketFacts(card, t, locale)
  const seen = seenDay(card.lastSeenAt)

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(card)}
        className="group flex w-full items-stretch gap-3 overflow-hidden rounded-lg border border-border bg-surface/60 text-left transition-colors hover:bg-surface"
      >
        <div className="w-32 shrink-0 overflow-hidden sm:w-48">
          <MarketPhoto
            card={card}
            brand={brand}
            model={model}
            kind={kind}
            fallback={fallback}
            className="h-full min-h-28"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1 py-2 pr-3">
          <p className="flex items-baseline justify-between gap-2">
            <span className="text-base font-semibold group-hover:text-primary">{price ?? '-'}</span>
            {card.year && <span className="text-sm text-muted">{card.year}</span>}
          </p>
          {original && <p className="text-xs text-muted">{original}</p>}
          {facts.length > 0 && <p className="text-sm text-muted">{facts.join(' · ')}</p>}
          {card.hasAccident && <p className="text-xs text-amber-600 dark:text-amber-400">{t('market.accident')}</p>}
          <p className="truncate text-sm text-muted">
            <span aria-hidden>{countryFlag(card.country)}</span> {card.region ?? card.country ?? ''}
          </p>
          <p className="truncate text-xs text-muted/80">
            {card.sourceName}
            {seen ? ` · ${t('market.lastSeen', { date: seen })}` : ''}
          </p>
        </div>
      </button>
    </li>
  )
}
