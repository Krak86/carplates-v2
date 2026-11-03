import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { MarketCard, WikiImage } from '@carplates/shared'

import { toIntlLocale } from '@/lib/intl'
import {
  countryFlag,
  formatMileageKm,
  formatOriginalPrice,
  formatUsd,
  marketValueKey,
  marketValueText,
  seenDay
} from './helpers'
import MarketPhoto from './MarketPhoto'

type Props = {
  card: MarketCard
  brand: string
  model: string
  kind: string | null | undefined
  fallback: WikiImage | null
  onOpen: (card: MarketCard) => void
}

/** One listing: photo, year, asking price (USD + original), mileage, fuel, region + flag, source and "last seen". Opens the detail modal. */
export default function MarketCardTile({ card, brand, model, kind, fallback, onOpen }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const price = formatUsd(card.priceUsd, locale)
  const original = formatOriginalPrice(card.priceOriginal, card.currencyOriginal, locale)
  const mileage = formatMileageKm(card.mileage, locale)
  const seen = seenDay(card.lastSeenAt)
  const word = (value: string): string => t(marketValueKey(value), { defaultValue: marketValueText(value) })
  const facts = [
    mileage ? t('market.km', { km: mileage }) : null,
    card.fuel ? word(card.fuel) : null,
    card.transmission ? word(card.transmission) : null
  ].filter(Boolean)

  return (
    <li className="w-56 shrink-0">
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
