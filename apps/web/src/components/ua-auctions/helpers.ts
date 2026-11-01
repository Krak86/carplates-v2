import { setamLotUrl } from '@carplates/shared'
import type { AuctionGroup, AuctionLot, Currency, FxResponse } from '@carplates/shared'

type LotRef = Pick<AuctionLot, 'id' | 'lotNo' | 'url' | 'source' | 'auctionId'>

/** Where a lot comes from; data saved before Prozorro.Sale has no `source` and is SETAM. */
export const lotSource = (lot: Pick<AuctionLot, 'source'>): 'setam' | 'prozorro' => lot.source ?? 'setam'

/** `YYYY-MM` of a lot: the SETAM feed month, else the month the Prozorro bidding starts (that feed has no file month). */
export const lotMonthOf = (lot: Pick<AuctionLot, 'month' | 'auctionStart'>): string | null =>
  lot.month ?? lot.auctionStart?.slice(0, 7) ?? null

/** Subcategory of a lot; data saved before Prozorro.Sale has none and is SETAM. */
export const lotGroup = (lot: Pick<AuctionLot, 'group'>): AuctionGroup => lot.group ?? 'setam'

export type LotGroup = { group: AuctionGroup; lots: AuctionLot[] }

/**
 * Splits a newest-first lot list into subcategories. Groups come in the order of their newest lot, so the first group is the
 * one with the latest lot (the card opens it); inside a group the lots keep their newest-first order.
 */
export function groupLots(lots: readonly AuctionLot[]): LotGroup[] {
  const byGroup = new Map<AuctionGroup, AuctionLot[]>()
  for (const lot of lots) {
    const group = lotGroup(lot)
    const list = byGroup.get(group)
    if (list) list.push(lot)
    else byGroup.set(group, [lot])
  }
  return [...byGroup].map(([group, list]) => ({ group, lots: list }))
}

/** Photo widths of the API resizer (`apps/api/src/auctions/photo.schema.ts`): a thumbnail and the full-screen view. */
export const PHOTO_THUMB_WIDTH = 320
export const PHOTO_FULL_WIDTH = 1600

/** Thumbnails shown before the "show more" button. */
export const PHOTO_PREVIEW_COUNT = 4

/** Enum values Prozorro publishes for fuel and gearbox; anything else (free text) is shown as published. */
export const FUEL_TYPES = ['gasoline', 'diesel', 'electric', 'hybrid', 'naturalGas', 'other'] as const
export const TRANSMISSIONS = ['manual', 'automatic', 'semiAutomatic', 'other'] as const

/** `value` when it is one of `list`, else null: the caller translates the known ones and prints the rest as published. */
export const knownValue = (list: readonly string[], value: string | null | undefined): string | null =>
  value && list.includes(value) ? value : null

/** Stable React key of a lot of either source (data saved before Prozorro.Sale has no `id`). */
export const lotKey = (lot: LotRef): string => lot.id ?? `setam:${lot.lotNo}`

/** The lot's own auction page (SETAM or Prozorro.Sale); null when neither a link nor a lot number is known. */
export const lotLink = (lot: LotRef): string | null => lot.url ?? (lot.lotNo === null ? null : setamLotUrl(lot.lotNo))

/** What the card prints as the lot's number: the SETAM lot number, or the full Prozorro auction ID. */
export const lotNumber = (lot: LotRef): string =>
  lot.source === 'prozorro' ? (lot.auctionId ?? '') : String(lot.lotNo ?? '')

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

/** A lot that is neither sold nor still open: the card folds these behind "show more". */
export const isNotSoldLot = (lot: Pick<AuctionLot, 'sold' | 'status'>): boolean =>
  !lot.sold && lot.status !== OPEN_STATUS

/** Sold and open lots always show; of the not-sold ones the newest `VISIBLE_NOT_SOLD` until `showAll`. `hidden` is what "show more" reveals. */
export function visibleLots(
  lots: readonly AuctionLot[],
  showAll: boolean
): { shown: AuctionLot[]; hidden: number; notSold: number } {
  const notSold = lots.filter(isNotSoldLot).length
  let seen = 0
  const shown = lots.filter(l => !isNotSoldLot(l) || showAll || ++seen <= VISIBLE_NOT_SOLD)
  return { shown, hidden: lots.length - shown.length, notSold }
}

export type PricePoint = {
  lot: AuctionLot
  /** 1-based round within the lot's proceeding (lots sharing a proceeding number are repeat auctions); null without a proceeding. */
  round: number | null
}

/** Lots with a start price, oldest first, each tagged with its round in the proceeding. */
export function priceSeries(lots: readonly AuctionLot[]): PricePoint[] {
  // The API answers newest first (both sources), so oldest first is the reverse.
  const oldestFirst = lots.filter(l => l.startPrice !== null).toReversed()
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
