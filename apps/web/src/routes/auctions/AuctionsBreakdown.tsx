import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuctionStatsRow, Currency, FxResponse } from '@carplates/shared'

import { formatPrice } from '@/components/ua-auctions/helpers'
import { toIntlLocale } from '@/lib/intl'
import { formatDelta, monthLabel, sortRows, withSoldPercent } from '@/routes/auctions/helpers'
import { AUCTION_COLUMNS } from '@/routes/auctions/types'
import type { AuctionColumn, AuctionDimension, FilterableDimension } from '@/routes/auctions/types'

type Props = {
  rows: readonly AuctionStatsRow[]
  dimension: AuctionDimension
  currency: Currency
  fx: FxResponse | null
  /** Called with the row label to show that region / make in the lot list (only region and make rows are filterable). */
  onPick: (dimension: FilterableDimension, value: string) => void
}

/** Sortable breakdown of the auction lots by one dimension (region, make, model year, month of the feed file). */
export default function AuctionsBreakdown({ rows, dimension, currency, fx, onPick }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const [sort, setSort] = useState<{ column: AuctionColumn; desc: boolean }>({ column: 'lots', desc: true })
  const [filter, setFilter] = useState('')
  const numberFormat = new Intl.NumberFormat(locale)

  const needle = filter.trim().toLocaleLowerCase(locale)
  const shown = sortRows(
    withSoldPercent(rows).filter(r => !needle || r.label.toLocaleLowerCase(locale).includes(needle)),
    sort.column,
    sort.desc,
    locale
  )

  const handleSort = (column: AuctionColumn): void =>
    setSort(prev => ({ column, desc: prev.column === column ? !prev.desc : column !== 'label' }))

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder={t('stats.filterPlaceholder')}
        aria-label={t('stats.filterPlaceholder')}
        className="mb-3 w-full max-w-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm"
      />

      <div className="max-h-[clamp(320px,70dvh,900px)] overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-sm">
        <table className="w-full text-sm tabular-nums">
          <thead className="sticky top-0 bg-[var(--color-surface)]">
            <tr>
              {AUCTION_COLUMNS.map(column => (
                <th
                  key={column}
                  aria-sort={sort.column === column ? (sort.desc ? 'descending' : 'ascending') : 'none'}
                  className="px-3 py-2 text-left font-medium select-none"
                >
                  <button type="button" onClick={() => handleSort(column)} className="cursor-pointer font-medium">
                    {column === 'label' ? t(`auctions.page.dimension.${dimension}`) : t(`auctions.page.col.${column}`)}
                    {sort.column === column && (sort.desc ? ' ▼' : ' ▲')}
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {shown.map(r => (
              <tr key={r.label} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2">
                  {dimension === 'region' || dimension === 'make' ? (
                    <button
                      type="button"
                      onClick={() => onPick(dimension, r.label)}
                      title={t('auctions.page.showLots')}
                      className="text-left text-[var(--color-primary)] underline"
                    >
                      {r.label}
                    </button>
                  ) : dimension === 'month' ? (
                    monthLabel(r.label, locale)
                  ) : (
                    r.label
                  )}
                </td>
                <td className="px-3 py-2">{numberFormat.format(r.lots)}</td>
                <td className="px-3 py-2">{numberFormat.format(r.sold)}</td>
                <td className="px-3 py-2">{`${r.soldPercent.toLocaleString(locale, { maximumFractionDigits: 1 })}%`}</td>
                <td className="px-3 py-2">{formatDelta(r.avgDeltaPercent, locale)}</td>
                <td className="px-3 py-2">{formatPrice(r.medianSale, currency, fx, locale) ?? '-'}</td>
              </tr>
            ))}

            {shown.length === 0 && (
              <tr>
                <td colSpan={AUCTION_COLUMNS.length} className="px-3 py-6 text-center text-[var(--color-muted)]">
                  {t('stats.noRows')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
