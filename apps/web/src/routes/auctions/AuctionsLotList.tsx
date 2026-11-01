import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { AUCTION_OUTCOMES, AUCTION_SORTS } from '@carplates/shared'
import type { AuctionListLot, AuctionListQuery, AuctionStatsRow, Currency, FxResponse } from '@carplates/shared'

import {
  LOT_STATUS_KEYS,
  OPEN_STATUS,
  formatLotMonth,
  formatPrice,
  lotKey,
  lotLink,
  lotNumber,
  priceDeltaPercent
} from '@/components/ua-auctions/helpers'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { auctionListQuery } from '@/lib/queries'
import { pageCount } from '@/routes/auctions/helpers'

type Props = {
  query: AuctionListQuery
  makes: readonly AuctionStatsRow[]
  regions: readonly AuctionStatsRow[]
  currency: Currency
  fx: FxResponse | null
  onChange: (changes: Record<string, string | null>) => void
  onReset: () => void
}

const FIELD =
  'rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-fg)]'

function LotRow({ lot, currency, fx }: { lot: AuctionListLot; currency: Currency; fx: FxResponse | null }): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const statusKey = LOT_STATUS_KEYS[lot.status]
  const delta = priceDeltaPercent(lot.startPrice, lot.salePrice)
  const isOpen = lot.status === OPEN_STATUS && !lot.sold
  const carPath = lot.plate ? `/${lot.plate}` : lot.vin ? `/${lot.vin}` : null
  const vehicle = [lot.make, lot.model, lot.year].filter(Boolean).join(' ') || lot.title

  return (
    <li
      className={cn(
        'rounded-lg border p-3 text-sm',
        lot.sold ? 'border-green-600/60 bg-green-600/10' : 'border-[var(--color-border)] bg-[var(--color-border)]/20'
      )}
    >
      <p className="font-semibold">
        {lot.sold ? '💰' : isOpen ? '🔔' : '🔨'} {vehicle}
      </p>

      <p className="text-[var(--color-muted)]">
        {[formatLotMonth(lot.month, locale), statusKey ? t(`uaAuctions.status.${statusKey}`) : lot.status, lot.region]
          .filter(Boolean)
          .join(' · ')}
      </p>

      <p className="mt-1">
        {lot.startPrice !== null && (
          <span>
            {t('uaAuctions.startPrice')}: {formatPrice(lot.startPrice, currency, fx, locale)}
          </span>
        )}
        {lot.salePrice !== null && (
          <span className="ml-3">
            {t('uaAuctions.salePrice')}: <strong>{formatPrice(lot.salePrice, currency, fx, locale)}</strong>
            {delta !== null && delta !== 0 && (
              <span className="text-[var(--color-muted)]">{` (${delta > 0 ? '+' : ''}${delta}%)`}</span>
            )}
          </span>
        )}
      </p>

      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        <a
          href={lotLink(lot) ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-primary)] underline"
        >
          {t('uaAuctions.lotNo')} {lotNumber(lot)} ↗<span className="sr-only">{t('field.opensNewTab')}</span>
        </a>

        {carPath && (
          <Link to={carPath} className="text-[var(--color-primary)] underline">
            {t('auctions.page.openCar')}: {lot.plate ?? lot.vin}
          </Link>
        )}
      </p>
    </li>
  )
}

/** Filter bar, sort and a paged list of all auction lots; the filters come from (and go back to) the URL. */
export default function AuctionsLotList({ query, makes, regions, currency, fx, onChange, onReset }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const { data, isError, isPlaceholderData } = useQuery(auctionListQuery(query))
  const page = query.page ?? 1
  const pages = data ? pageCount(data.total, data.pageSize) : 1

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
          {t('auctions.page.dimension.make')}
          <select
            value={query.make ?? ''}
            onChange={e => onChange({ make: e.target.value })}
            className={cn(FIELD, 'max-w-44')}
          >
            <option value="">{t('auctions.page.any')}</option>
            {makes.map(m => (
              <option key={m.label} value={m.label}>
                {m.label}
              </option>
            ))}
            {query.make && !makes.some(m => m.label === query.make) && <option value={query.make}>{query.make}</option>}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
          {t('auctions.page.dimension.region')}
          <select
            value={query.region ?? ''}
            onChange={e => onChange({ region: e.target.value })}
            className={cn(FIELD, 'max-w-44')}
          >
            <option value="">{t('auctions.page.any')}</option>
            {regions.map(r => (
              <option key={r.label} value={r.label}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
          {t('auctions.page.statusLabel')}
          <select
            value={query.status ?? ''}
            onChange={e => onChange({ status: e.target.value })}
            className={cn(FIELD, 'max-w-44')}
          >
            <option value="">{t('auctions.page.any')}</option>
            {Object.entries(LOT_STATUS_KEYS).map(([status, key]) => (
              <option key={status} value={status}>
                {t(`uaAuctions.status.${key}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
          {t('auctions.page.outcomeLabel')}
          <select value={query.outcome} onChange={e => onChange({ outcome: e.target.value })} className={FIELD}>
            {AUCTION_OUTCOMES.map(o => (
              <option key={o} value={o}>
                {t(`auctions.page.outcome.${o}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
          {t('auctions.page.minPrice')}
          <input
            key={`min-${query.minPrice ?? ''}`}
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={query.minPrice ?? ''}
            onBlur={e => onChange({ min: e.target.value })}
            className={cn(FIELD, 'w-28')}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
          {t('auctions.page.maxPrice')}
          <input
            key={`max-${query.maxPrice ?? ''}`}
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={query.maxPrice ?? ''}
            onBlur={e => onChange({ max: e.target.value })}
            className={cn(FIELD, 'w-28')}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
          {t('auctions.page.sortLabel')}
          <select value={query.sort} onChange={e => onChange({ sort: e.target.value })} className={FIELD}>
            {AUCTION_SORTS.map(s => (
              <option key={s} value={s}>
                {t(`auctions.page.sort.${s}`)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => onChange({ asc: query.asc === 'true' ? null : 'true' })}
          aria-label={query.asc === 'true' ? t('auctions.page.sortAsc') : t('auctions.page.sortDesc')}
          title={query.asc === 'true' ? t('auctions.page.sortAsc') : t('auctions.page.sortDesc')}
          className={cn(FIELD, 'cursor-pointer')}
        >
          {query.asc === 'true' ? '▲' : '▼'}
        </button>

        <button type="button" onClick={onReset} className="px-2 py-1.5 text-sm text-[var(--color-primary)] underline">
          {t('auctions.page.reset')}
        </button>
      </div>

      {isError && <p className="text-[var(--color-muted)]">{t('result.error')}</p>}

      {data && (
        <>
          <p className="mb-2 text-sm text-[var(--color-muted)]">
            {t('auctions.page.total', { count: data.total, formatted: data.total.toLocaleString(locale) })}
          </p>

          <ul className={cn('space-y-2', isPlaceholderData && 'opacity-60')}>
            {data.lots.map(lot => (
              <LotRow key={lotKey(lot)} lot={lot} currency={currency} fx={fx} />
            ))}
          </ul>

          {data.lots.length === 0 && (
            <p className="py-6 text-center text-[var(--color-muted)]">{t('auctions.page.empty')}</p>
          )}

          {pages > 1 && (
            <div className="mt-3 flex items-center justify-center gap-3 text-sm">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onChange({ page: String(page - 1) })}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40"
              >
                {t('auctions.page.prev')}
              </button>

              <span className="tabular-nums">{t('auctions.page.pageOf', { page, pages })}</span>

              <button
                type="button"
                disabled={page >= pages}
                onClick={() => onChange({ page: String(page + 1) })}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40"
              >
                {t('auctions.page.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
