import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuctionPriceCheck, Currency, FxResponse } from '@carplates/shared'

import { formatPrice } from '@/components/ua-auctions/helpers'
import { toIntlLocale } from '@/lib/intl'

type Props = {
  check: AuctionPriceCheck | null | undefined
  currency: Currency
  fx: FxResponse | null
}

/** One line under the status: the newest sold lot against the median of the other sold lots of the same car (our own feed copy). */
export default function UaAuctionPriceCheck({ check, currency, fx }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  if (!check) return null

  const locale = toIntlLocale(i18n.language)
  const kind = check.deltaPercent > 0 ? 'above' : check.deltaPercent < 0 ? 'below' : 'same'

  return (
    <p className="mb-2 text-sm text-[var(--color-muted)]">
      📊{' '}
      {t(`uaAuctions.priceCheck.${kind}`, {
        percent: Math.abs(check.deltaPercent),
        peers: check.peers,
        car: [check.make, check.model, check.year].filter(Boolean).join(' '),
        median: formatPrice(check.medianSale, currency, fx, locale) ?? '-'
      })}
    </p>
  )
}
