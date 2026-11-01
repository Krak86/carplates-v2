import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import Card from '@/components/ui/Card'
import {
  formatLotMonth,
  formatPrice,
  lotKey,
  lotLink,
  lotMonthOf,
  lotSourceAccent,
  mixLots
} from '@/components/ua-auctions/helpers'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { auctionListQuery } from '@/lib/queries'

const TEASER_SIZE = 5

/** Mounted by `LazySection`, so its query starts only once the section nears the viewport. */
export default function HomeAuctionsSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  // Same mix as the /auctions "new lots" card: Prozorro lots are newer and would crowd SETAM out of a single list.
  const setam = useQuery(auctionListQuery({ outcome: 'open', sort: 'newest', source: 'setam' })).data
  const prozorro = useQuery(auctionListQuery({ outcome: 'open', sort: 'newest', source: 'prozorro' })).data
  const lots = mixLots(setam?.lots ?? [], prozorro?.lots ?? [], TEASER_SIZE)

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

              return (
                <li
                  key={lotKey(lot)}
                  className={cn('flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2 pl-2', lotSourceAccent(lot))}
                >
                  <a
                    href={lotLink(lot) ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--color-primary)] underline"
                  >
                    {[lot.make, lot.model, lot.year].filter(Boolean).join(' ') || lot.title}
                    <span className="sr-only">{t('field.opensNewTab')}</span>
                  </a>

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
