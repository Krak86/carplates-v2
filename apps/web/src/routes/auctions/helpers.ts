import type { AuctionStatsResponse, AuctionStatsRow } from '@carplates/shared'

import type { AuctionColumn, AuctionDimension, AuctionTableRow } from '@/routes/auctions/types'

/** Sold share of a row in percent with one decimal (0 without lots). */
export const soldPercent = (row: Pick<AuctionStatsRow, 'lots' | 'sold'>): number =>
  row.lots > 0 ? Math.round((row.sold / row.lots) * 1000) / 10 : 0

export const withSoldPercent = (rows: readonly AuctionStatsRow[]): AuctionTableRow[] =>
  rows.map(r => ({ ...r, soldPercent: soldPercent(r) }))

export function dimensionRows(data: AuctionStatsResponse, dim: AuctionDimension): AuctionStatsRow[] {
  switch (dim) {
    case 'region':
      return data.byRegion
    case 'make':
      return data.byMake
    case 'year':
      return data.byYear
    case 'month':
      return data.byMonth
  }
}

/** `+27.1 %` / `-12 %` / `-` for a mean sale-vs-start change. */
export function formatDelta(percent: number | null, locale: string): string {
  if (percent === null) return '-'
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(percent)
  return `${n}%`
}

export const pageCount = (total: number, pageSize: number): number => Math.max(1, Math.ceil(total / pageSize))

/** Rows ordered by a column; text compares as a locale string, numbers with nulls last. Does not mutate. */
export function sortRows(
  rows: readonly AuctionTableRow[],
  column: AuctionColumn,
  desc: boolean,
  locale: string
): AuctionTableRow[] {
  const sign = desc ? -1 : 1
  return rows.toSorted((a, b) => {
    if (column === 'label') return sign * a.label.localeCompare(b.label, locale, { numeric: true })
    const av = a[column]
    const bv = b[column]
    if (av === null && bv === null) return 0
    if (av === null) return 1
    if (bv === null) return -1
    return sign * (av - bv)
  })
}

/** `2024-08` -> "серпень 2024"; any other label passes through. */
export function monthLabel(label: string, locale: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(label)
  if (!m) return label
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)).toLocaleDateString(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  })
}
