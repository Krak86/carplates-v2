import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { Currency, FxResponse } from '@carplates/shared'

import Card from '@/components/ui/Card'
import { formatLotMonth, formatPrice, lotKey, lotLink } from '@/components/ua-auctions/helpers'
import { toIntlLocale } from '@/lib/intl'
import { auctionListQuery } from '@/lib/queries'

type Props = {
  currency: Currency
  fx: FxResponse | null
  /** Show every open lot in the list below (outcome = open, newest first). */
  onShowAll: () => void
}

const SHOWN = 6

/** The newest lots still open for bids, each with a direct link to its SETAM page. */
export default function AuctionsNewLots({ currency, fx, onShowAll }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const { data } = useQuery(auctionListQuery({ outcome: 'open', sort: 'newest' }))
  const lots = data?.lots.slice(0, SHOWN) ?? []

  if (lots.length === 0) return null

  return (
    <Card className="mb-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{t('auctions.page.new.title')}</h2>

        <button type="button" onClick={onShowAll} className="text-sm text-[var(--color-primary)] underline">
          {t('auctions.page.new.all', { count: data?.total ?? lots.length })}
        </button>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lots.map(lot => (
          <li
            key={lotKey(lot)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-border)]/20 p-3 text-sm"
          >
            <p className="font-semibold">🔔 {[lot.make, lot.model, lot.year].filter(Boolean).join(' ') || lot.title}</p>

            <p className="text-[var(--color-muted)]">
              {[formatLotMonth(lot.month, locale), lot.region].filter(Boolean).join(' · ')}
            </p>

            {lot.startPrice !== null && (
              <p className="mt-1">
                {t('uaAuctions.startPrice')}: <strong>{formatPrice(lot.startPrice, currency, fx, locale)}</strong>
              </p>
            )}

            <a
              href={lotLink(lot) ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-[var(--color-primary)] underline"
            >
              {t('auctions.page.new.open')} ↗<span className="sr-only">{t('field.opensNewTab')}</span>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  )
}
