import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { AuctionListLot } from '@carplates/shared'

import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import Card from '@/components/ui/Card'
import {
  formatLotMonth,
  formatPrice,
  lotKey,
  lotMonthOf,
  lotSourceAccent,
  mixLots
} from '@/components/ua-auctions/helpers'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { auctionListQuery } from '@/lib/queries'

const TEASER_SIZE = 5

/** In-app car page of a lot (plate first, else VIN), or null when the lot names neither. */
const carPathOf = (lot: Pick<AuctionListLot, 'plate' | 'vin'>): string | null =>
  lot.plate ? `/${lot.plate}` : lot.vin ? `/${lot.vin}` : null

/** Mounted by `LazySection`, so its query starts only once the section nears the viewport. */
export default function HomeAuctionsSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  // Same mix as the /auctions "new lots" card: Prozorro lots are newer and would crowd SETAM out of a single list.
  const setam = useQuery(auctionListQuery({ outcome: 'open', sort: 'newest', source: 'setam' })).data
  const prozorro = useQuery(auctionListQuery({ outcome: 'open', sort: 'newest', source: 'prozorro' })).data
  // Only lots that name a plate / VIN: each row links to our own car page, so a lot without one would have nothing to open.
  const lots = mixLots((setam?.lots ?? []).filter(carPathOf), (prozorro?.lots ?? []).filter(carPathOf), TEASER_SIZE)

  if (lots.length === 0) return null

  return (
    <LoadErrorBoundary compact>
      <div className="section-vt w-full max-w-6xl">
        <Card>
          <h2 className="mb-2 text-lg font-semibold">
            <span aria-hidden>🔔</span> {t('auctions.page.new.title')}
          </h2>

          <ul className="divide-y divide-[var(--color-border)]">
            {lots.map(lot => {
              const price = formatPrice(lot.startPrice, 'UAH', null, locale)
              const carPath = carPathOf(lot)

              return (
                <li
                  key={lotKey(lot)}
                  className={cn('flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2 pl-2', lotSourceAccent(lot))}
                >
                  <span className="font-semibold">
                    {[lot.make, lot.model, lot.year].filter(Boolean).join(' ') || lot.title}
                  </span>

                  {carPath && (
                    <Link
                      viewTransition
                      to={carPath}
                      className="font-mono text-sm text-[var(--color-primary)] underline"
                    >
                      {lot.plate ?? lot.vin} <span aria-hidden>→</span>
                      <span className="sr-only">{t('auctions.page.openCar')}</span>
                    </Link>
                  )}

                  <span className="min-w-0 flex-1 text-xs text-[var(--color-muted)]">
                    {[formatLotMonth(lotMonthOf(lot), locale), lot.region].filter(Boolean).join(' · ')}
                  </span>

                  {price && <span className="text-sm tabular-nums">{price}</span>}
                </li>
              )
            })}
          </ul>

          <p className="mt-3 text-sm">
            <Link viewTransition to="/auctions" className="text-[var(--color-primary)] underline">
              {t('auctions.page.title')} →
            </Link>
          </p>
        </Card>
      </div>
    </LoadErrorBoundary>
  )
}
