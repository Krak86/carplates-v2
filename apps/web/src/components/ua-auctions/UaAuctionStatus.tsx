import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuctionLot, Currency, FxResponse } from '@carplates/shared'

import { OPEN_STATUS, formatLotMonth, formatPrice, lotMonthOf } from '@/components/ua-auctions/helpers'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'

type Props = {
  /** Newest lot first. */
  lots: readonly AuctionLot[]
  currency: Currency
  fx: FxResponse | null
}

/** The answer at a glance, first in the section: the newest lot decides - on sale now, sold (and for how much) or not sold. */
export default function UaAuctionStatus({ lots, currency, fx }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const latest = lots[0]
  if (!latest) return null

  const month = formatLotMonth(lotMonthOf(latest), locale) ?? ''
  const isOpen = latest.status === OPEN_STATUS
  const kind = latest.sold ? 'sold' : isOpen ? 'open' : 'notSold'
  const text = t(`uaAuctions.now.${kind}`, {
    month,
    price: formatPrice(latest.salePrice ?? latest.startPrice, currency, fx, locale) ?? '-',
    count: lots.length
  })

  return (
    <p
      className={cn(
        'mb-2 rounded-lg border px-3 py-2 text-sm font-semibold',
        latest.sold
          ? 'border-green-600/60 bg-green-600/10'
          : isOpen
            ? 'border-amber-500/60 bg-amber-500/10'
            : 'border-[var(--color-border)] bg-[var(--color-border)]/20'
      )}
    >
      {latest.sold ? '💰' : isOpen ? '🔔' : '🔨'} {text}
    </p>
  )
}
