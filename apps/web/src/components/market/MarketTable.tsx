import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { MarketCard } from '@carplates/shared'

import { toIntlLocale } from '@/lib/intl'
import { countryFlag, formatMileageKm, formatPriceIn, marketWord, seenDay } from './helpers'
import type { MarketCurrency } from './use-market-currency'

type Props = {
  cards: readonly MarketCard[]
  money: MarketCurrency
  onOpen: (card: MarketCard) => void
}

const cell = 'whitespace-nowrap px-3 py-2'

/** "Table" layout: one dense line per listing for comparing prices and mileage; no photos. */
export default function MarketTable({ cards, money, onOpen }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface/80 text-xs text-muted">
          <tr>
            <th scope="col" className={cell}>
              {t('market.col.price')}
            </th>
            <th scope="col" className={cell}>
              {t('market.fact.year')}
            </th>
            <th scope="col" className={cell}>
              {t('market.fact.mileage')}
            </th>
            <th scope="col" className={cell}>
              {t('market.fact.fuel')}
            </th>
            <th scope="col" className={cell}>
              {t('market.fact.transmission')}
            </th>
            <th scope="col" className={cell}>
              {t('market.col.region')}
            </th>
            <th scope="col" className={cell}>
              {t('market.col.source')}
            </th>
          </tr>
        </thead>
        <tbody>
          {cards.map(card => {
            const km = formatMileageKm(card.mileage, locale)
            const seen = seenDay(card.lastSeenAt)
            return (
              <tr key={card.id} className="border-t border-border hover:bg-surface/60">
                <td className={cell}>
                  <button
                    type="button"
                    onClick={() => onOpen(card)}
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {formatPriceIn(card.priceUsd, money.shown, money.rates, locale) ?? '-'}
                  </button>
                </td>
                <td className={cell}>{card.year ?? '-'}</td>
                <td className={cell}>{km ? t('market.km', { km }) : '-'}</td>
                <td className={cell}>{card.fuel ? marketWord(t, card.fuel) : '-'}</td>
                <td className={cell}>{card.transmission ? marketWord(t, card.transmission) : '-'}</td>
                <td className={cell}>
                  <span aria-hidden>{countryFlag(card.country)}</span> {card.region ?? card.country ?? ''}
                </td>
                <td className={`${cell} text-xs text-muted`}>
                  {card.sourceName}
                  {seen ? ` · ${seen}` : ''}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
