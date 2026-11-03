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
  /** Width classes of the `<li>`: a fixed strip tile by default, `w-full` inside the modal grid. */
  className?: string
}

/** One listing: photo, year, asking price (chosen currency + original), mileage, fuel, region + flag, source and "last seen". Opens the detail modal. */
export default function MarketCardTile({
  card,
  brand,
  model,
  kind,
  fallback,
  money,
  onOpen,
  className = 'w-56 shrink-0'
}: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const price = formatPriceIn(card.priceUsd, money.shown, money.rates, locale)
  const original = formatOriginalPrice(card.priceOriginal, card.currencyOriginal, locale, money.shown)
  const seen = seenDay(card.lastSeenAt)
  const facts = marketFacts(card, t, locale)

  return (
    <li className={className}>
      <button
        type="button"
        onClick={() => onOpen(card)}
        className="group block h-full w-full overflow-hidden rounded-lg border border-border bg-surface/60 text-left transition-colors hover:bg-surface"
      >
        <MarketPhoto card={card} brand={brand} model={model} kind={kind} fallback={fallback} />

        <div className="space-y-1 p-2.5">
          <p className="flex items-baseline justify-between gap-2">
            <span className="text-base font-semibold text-fg group-hover:text-primary">{price ?? '-'}</span>
            {card.year && <span className="text-sm text-muted">{card.year}</span>}
          </p>
          {original && <p className="text-xs text-muted">{original}</p>}
          {facts.length > 0 && <p className="line-clamp-2 text-xs text-muted">{facts.join(' · ')}</p>}
          {card.hasAccident && <p className="text-xs text-amber-600 dark:text-amber-400">{t('market.accident')}</p>}
          <p className="truncate text-xs text-muted">
            <span aria-hidden>{countryFlag(card.country)}</span> {card.region ?? card.country ?? ''}
          </p>
          <p className="truncate text-[11px] text-muted/80">
            {card.sourceName}
            {seen ? ` · ${t('market.lastSeen', { date: seen })}` : ''}
          </p>
        </div>
      </button>
    </li>
  )
}
