import type { AuctionLot, AuctionResponse } from '@carplates/shared'

import {
  formatLotMonth,
  formatPrice,
  LOT_STATUS_KEYS,
  lotMonthOf,
  lotNumber,
  lotSource
} from '@/components/ua-auctions/helpers'
import type { ExportTableSection, Translate } from '@/lib/export-report'

export type ExportAuctionsInput = {
  auctionLots?: AuctionResponse | null
}

function statusLabel(lot: AuctionLot, t: Translate): string {
  const key = LOT_STATUS_KEYS[lot.status]
  return key ? t(`uaAuctions.status.${key}`) : lot.status
}

/** Mirrors the "Ukrainian auctions" card: every SETAM / Prozorro.Sale lot of the plate / VIN, newest first, prices in hryvnias. */
export function buildAuctionsSection(
  input: ExportAuctionsInput,
  t: Translate,
  lang: string
): ExportTableSection | null {
  const lots = input.auctionLots?.lots ?? []
  if (lots.length === 0) return null
  const locale = lang === 'ua' ? 'uk' : lang
  const price = (uah: number | null): string => formatPrice(uah, 'UAH', null, locale) ?? '-'

  return {
    type: 'table',
    id: 'ua-auctions',
    title: t('uaAuctions.title'),
    note: t('export.auctionsSource'),
    columns: [
      t('export.source'),
      t('uaAuctions.lotNo'),
      t('export.status'),
      t('export.date'),
      t('uaAuctions.startPrice'),
      t('uaAuctions.salePrice'),
      t('uaAuctions.region')
    ],
    rows: lots.map(lot => [
      lotSource(lot) === 'prozorro' ? 'Prozorro.Sale' : 'SETAM',
      lotNumber(lot) || '-',
      lot.sold ? `${t('uaAuctions.sold')} · ${statusLabel(lot, t)}` : statusLabel(lot, t),
      formatLotMonth(lotMonthOf(lot), locale) ?? '-',
      price(lot.startPrice),
      price(lot.salePrice),
      lot.locality ?? lot.region ?? '-'
    ])
  }
}
