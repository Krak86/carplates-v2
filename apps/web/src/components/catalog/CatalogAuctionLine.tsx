import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { formatPrice } from '@/components/ua-auctions/helpers'
import { toIntlLocale } from '@/lib/intl'
import { auctionStatsQuery } from '@/lib/queries'

type Props = {
  makeName: string
}

/** "At Ukrainian auctions" line for a make: lots, sold and median sale price from the shared auction stats (null when the make has no lots). */
export default function CatalogAuctionLine({ makeName }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const stats = useQuery(auctionStatsQuery())
  const wanted = makeName.trim().toUpperCase()
  const row = stats.data?.byMake.find(r => r.label.toUpperCase() === wanted)
  if (!row) return null

  const locale = toIntlLocale(i18n.language)
  const median = formatPrice(row.medianSale, 'UAH', null, locale)

  return (
    <p className="mt-2 text-base">
      {t('catalog.auction.line', { lots: row.lots.toLocaleString(locale), sold: row.sold.toLocaleString(locale) })}
      {median ? t('catalog.auction.median', { price: median }) : ''}.{' '}
      <Link to={`/auctions?make=${encodeURIComponent(row.label)}`} className="text-[var(--color-primary)] underline">
        {t('catalog.auction.link')}
      </Link>
    </p>
  )
}
