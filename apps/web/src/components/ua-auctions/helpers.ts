import type { AuctionLot, Currency, FxResponse } from '@carplates/shared'

/** Feed status (Ukrainian) -> i18n key suffix of `uaAuctions.status.*`; an unknown status is shown as published. */
export const LOT_STATUS_KEYS: Readonly<Record<string, string>> = {
  'Торги відбулися': 'held',
  'Торги не відбулися': 'notHeld',
  'Реєстрація учасників': 'registration',
  'Торги припинено': 'terminated',
  'Торги зупинено': 'suspended',
  'Складання акту': 'act',
  'Очікування сплати': 'payment'
}

/** Status of a lot still running (registration open): the card calls it "open", not "not sold". */
export const OPEN_STATUS = 'Реєстрація учасників'

/** Sale price relative to the start price, e.g. +25 (sold 25 % above) or -30; null without both prices. */
export function priceDeltaPercent(start: number | null, sale: number | null): number | null {
  if (start === null || sale === null || start <= 0) return null
  return Math.round(((sale - start) / start) * 100)
}

/** `2024-08` -> "серпень 2024" in the UI language; null for anything else. */
export function formatLotMonth(month: string | null | undefined, locale: string): string | null {
  const m = month ? /^(\d{4})-(\d{2})$/.exec(month) : null
  if (!m) return null
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

/** Not-sold lots shown before the "show more" button; sold and open lots are always shown. */
export const VISIBLE_NOT_SOLD = 3

export type PricePoint = {
  lot: AuctionLot
  /** 1-based round within the lot's proceeding (lots sharing a proceeding number are repeat auctions); null without a proceeding. */
  round: number | null
}

/** Lots with a start price, oldest first (lot numbers grow with time), each tagged with its round in the proceeding. */
export function priceSeries(lots: readonly AuctionLot[]): PricePoint[] {
  const oldestFirst = lots.filter(l => l.startPrice !== null).toSorted((a, b) => a.lotNo - b.lotNo)
  const seen = new Map<string, number>()
  return oldestFirst.map(lot => {
    if (!lot.proceedingNo) return { lot, round: null }
    const round = (seen.get(lot.proceedingNo) ?? 0) + 1
    seen.set(lot.proceedingNo, round)
    return { lot, round }
  })
}

/** 41255 -> "41 тис." style short number for the chart axis. */
export const formatCompactUah = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value)

type Rates = Pick<FxResponse, 'eurUah' | 'usdUah'>

/** Lot prices are hryvnias; EUR / USD are converted at the NBU rate of the day (UAH until the rates arrive). */
export function convertUah(uah: number, currency: Currency, rates: Rates | null): number {
  if (!rates || currency === 'UAH') return uah
  return currency === 'EUR' ? uah / rates.eurUah : uah / rates.usdUah
}

export const effectiveLotCurrency = (wanted: Currency, rates: Rates | null): Currency => (rates ? wanted : 'UAH')

/** "41 255 грн" / "€1,012" - a lot price in the chosen currency, null passes through. */
export function formatPrice(
  uah: number | null,
  currency: Currency,
  rates: Rates | null,
  locale: string
): string | null {
  if (uah === null) return null
  const shown = effectiveLotCurrency(currency, rates)
  return new Intl.NumberFormat(locale, { style: 'currency', currency: shown, maximumFractionDigits: 0 }).format(
    convertUah(uah, shown, rates)
  )
}

/** Lots worth a marker in the owner-history timeline: every sold lot, plus the newest lot when it did not sell. */
export function timelineLots(lots: readonly AuctionLot[]): AuctionLot[] {
  return lots.filter((l, i) => l.sold || i === 0)
}
