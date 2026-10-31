import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AUCTIONS_DATASET_URL, PROZORRO_SALE_URL, SETAM_URL } from '@carplates/shared'
import type { Currency } from '@carplates/shared'

import Card from '@/components/ui/Card'
import AuctionCurrency from '@/components/ua-auctions/AuctionCurrency'
import { formatPrice } from '@/components/ua-auctions/helpers'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { auctionStatsQuery, fxQuery } from '@/lib/queries'
import StatsSkeleton from '@/routes/stats/StatsSkeleton'
import AuctionsBreakdown from '@/routes/auctions/AuctionsBreakdown'
import AuctionsLotList from '@/routes/auctions/AuctionsLotList'
import AuctionsNewLots from '@/routes/auctions/AuctionsNewLots'
import { dimensionRows, formatDelta } from '@/routes/auctions/helpers'
import { AUCTION_DIMENSIONS, AUCTION_DIMENSION_ICONS } from '@/routes/auctions/types'
import type { FilterableDimension } from '@/routes/auctions/types'
import { useAuctionFilters } from '@/routes/auctions/use-auction-filters'

const TAB_ON = 'border-transparent bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
const TAB_OFF =
  'border-[var(--color-border)]/50 bg-[var(--color-surface)]/50 text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]'
const LINK_CLASS = 'text-[var(--color-primary)] underline'

// Lazy-loaded (see App.tsx).
export default function AuctionsRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const online = useOnlineStatus()
  const stats = useQuery(auctionStatsQuery())
  const fx = useQuery(fxQuery()).data ?? null
  const { query, dimension, setParams, reset } = useAuctionFilters()
  const [currency, setCurrency] = useState<Currency>('UAH')

  const data = stats.data
  const summary = data?.summary
  const numberFormat = new Intl.NumberFormat(locale)

  const cards = summary
    ? [
        { label: t('auctions.page.card.lots'), value: numberFormat.format(summary.lots) },
        { label: t('auctions.page.card.sold'), value: numberFormat.format(summary.sold) },
        { label: t('auctions.page.card.open'), value: numberFormat.format(summary.open) },
        { label: t('auctions.page.card.avgDelta'), value: formatDelta(summary.avgDeltaPercent, locale) },
        {
          label: t('auctions.page.card.medianSale'),
          value: formatPrice(summary.medianSale, currency, fx, locale) ?? '-'
        }
      ]
    : []

  // A breakdown row opens the lot list filtered to that region / make.
  const handlePick = (dim: FilterableDimension, value: string): void => {
    setParams({ [dim]: value })
    document.getElementById('auction-lots')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleShowOpen = (): void => {
    setParams({ outcome: 'open', sort: 'newest', asc: null, status: null })
    document.getElementById('auction-lots')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="inline-block rounded-lg bg-[var(--color-bg)]/85 px-3 py-1.5 text-2xl font-bold backdrop-blur-sm">
          {t('auctions.page.title')}
        </h1>

        {data && (
          <p className="inline-block rounded bg-[var(--color-bg)]/85 px-2 py-1 text-sm text-[var(--color-muted)] backdrop-blur-sm">
            {data.checkedAt
              ? t('uaAuctions.checkedAt', { date: new Date(data.checkedAt).toLocaleString(locale) })
              : t('uaAuctions.neverLoaded')}
          </p>
        )}
      </div>

      <p className="mb-4 max-w-3xl rounded-lg bg-[var(--color-bg)]/85 px-3 py-2 text-sm backdrop-blur-sm">
        {t('auctions.page.intro')}
      </p>

      {!online && (
        <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-300">
          {t('offline.needsConnection')}
        </p>
      )}

      {stats.isPending && stats.fetchStatus !== 'paused' && <StatsSkeleton variant="registry" />}

      {stats.isError && <p className="text-[var(--color-muted)]">{t('result.error')}</p>}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {cards.map(c => (
              <Card key={c.label}>
                <div className="text-xs text-[var(--color-muted)] uppercase">{c.label}</div>
                <div className="text-xl font-semibold tabular-nums">{c.value}</div>
              </Card>
            ))}
          </div>

          <AuctionsNewLots currency={currency} fx={fx} onShowAll={handleShowOpen} />

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 rounded-lg bg-[var(--color-bg)]/85 p-1 backdrop-blur-sm">
              {AUCTION_DIMENSIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setParams({ dim: d })}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm transition-colors duration-200',
                    d === dimension ? TAB_ON : TAB_OFF
                  )}
                >
                  <span aria-hidden>{AUCTION_DIMENSION_ICONS[d]}</span> {t(`auctions.page.dimension.${d}`)}
                </button>
              ))}
            </div>

            <AuctionCurrency currency={currency} onChange={setCurrency} fx={fx} />
          </div>

          <div key={dimension} className="mb-2 animate-fade-in">
            <AuctionsBreakdown
              rows={dimensionRows(data, dimension)}
              dimension={dimension}
              currency={currency}
              fx={fx}
              onPick={handlePick}
            />
          </div>

          <p className="mb-8 text-xs text-[var(--color-muted)]">{t('uaAuctions.monthNote')}</p>

          <Card className="mb-6">
            <h2 id="auction-lots" className="mb-3 scroll-mt-4 text-lg font-semibold">
              {t('auctions.page.lots')}
            </h2>

            <AuctionsLotList
              query={query}
              makes={data.byMake}
              regions={data.byRegion}
              currency={currency}
              fx={fx}
              onChange={setParams}
              onReset={reset}
            />
          </Card>

          <p className="mb-6 text-xs text-[var(--color-muted)]">
            {t('auctions.page.source')}{' '}
            <a href={AUCTIONS_DATASET_URL} target="_blank" rel="noopener noreferrer nofollow" className={LINK_CLASS}>
              data.gov.ua
            </a>
            {' · '}
            <a href={SETAM_URL} target="_blank" rel="noopener noreferrer nofollow" className={LINK_CLASS}>
              SETAM
            </a>
            {' · '}
            <a href={PROZORRO_SALE_URL} target="_blank" rel="noopener noreferrer nofollow" className={LINK_CLASS}>
              Prozorro.Sale
            </a>
          </p>
        </>
      )}
    </div>
  )
}
