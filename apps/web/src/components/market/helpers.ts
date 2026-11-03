import { DEFAULT_MARKET_KIND, MARKET_KINDS, resolveVehicleKind } from '@carplates/shared'
import type { MarketCard, MarketKind, MarketResponse } from '@carplates/shared'

import type { MarketView, ResolvedMarketKind } from './types'

/** Cards shown before "show more". */
export const MARKET_VISIBLE = 6

const isMarketKind = (value: string): value is MarketKind => (MARKET_KINDS as readonly string[]).includes(value)

/**
 * Market kind of a car: `null` hides the block (motorcycles, trailers, ... are not in the catalogue). No kind at all
 * (a VIN-only or catalog page) is a passenger car. Accepts our own kind (`truck`) or the registry source value (`ВАНТАЖНИЙ`).
 */
export function marketKindOf(kind: string | null | undefined): ResolvedMarketKind {
  if (!kind) return DEFAULT_MARKET_KIND
  if (isMarketKind(kind)) return kind
  const resolved = resolveVehicleKind(kind)
  return resolved && isMarketKind(resolved) ? resolved : null
}

/** Regional-indicator flag of an ISO 3166-1 alpha-2 code; empty for anything else. */
export function countryFlag(iso2: string | null | undefined): string {
  const code = (iso2 ?? '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return ''
  return String.fromCodePoint(...[...code].map(ch => 0x1f1e6 + ch.charCodeAt(0) - 65))
}

/** Same-year cards first, then the closest years; the API order (country, newest seen) is kept within a year. */
export function floatSameYear(cards: readonly MarketCard[], year: number | null | undefined): MarketCard[] {
  if (!year) return [...cards]
  const gap = (card: MarketCard): number => (card.year ? Math.abs(card.year - year) : Number.MAX_SAFE_INTEGER)
  return cards
    .map((card, index) => ({ card, index }))
    .sort((a, b) => gap(a.card) - gap(b.card) || a.index - b.index)
    .map(entry => entry.card)
}

/** The block's view of an API answer, or null when there is nothing to show. */
export function toMarketView(response: MarketResponse | undefined, year: number | null | undefined): MarketView | null {
  if (!response || response.kind === 'none' || response.items.length === 0) return null
  return {
    dataset: response.kind,
    cards: floatSameYear(response.items, year),
    stale: !!response.stale,
    fetchedAt: response.fetchedAt ?? null,
    budget: response.budget ?? null
  }
}

/** Asking price in whole US dollars, or null. Grouping follows the UI locale. */
export function formatUsd(value: number | null | undefined, locale: string): string | null {
  if (value == null || !Number.isFinite(value)) return null
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

/** Price in the listing's own currency (`PLN 52 000`), shown only when it differs from USD. */
export function formatOriginalPrice(
  value: number | null | undefined,
  currency: string | null | undefined,
  locale: string
): string | null {
  const code = (currency ?? '').trim().toUpperCase()
  if (value == null || !Number.isFinite(value) || !/^[A-Z]{3}$/.test(code) || code === 'USD') return null
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(value)
  } catch {
    return null
  }
}

/** Mileage in thousands-grouped km, or null (a 0 from a feed that does not know is not shown). */
export function formatMileageKm(value: number | null | undefined, locale: string): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
}

/** `YYYY-MM-DD` of an ISO timestamp, or null. The card prints it as "last seen". */
export function seenDay(iso: string | null | undefined): string | null {
  return iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : null
}

/** Redirect link of a card ("Open at source"): a plain `<a>`, the API resolves the listing URL (1 request on a cache miss). */
export const marketGoHref = (id: string): string => `/api/market/go/${encodeURIComponent(id)}`

/** i18n key of a CarAPIS free-text value (`fuel`, `transmission`, `body`): `market.value.<lower_snake>`; the text itself is the fallback. */
export const marketValueKey = (value: string): string =>
  `market.value.${value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')}`

/** Fallback text of an unknown value: `plug_in_hybrid` -> `plug in hybrid`. */
export const marketValueText = (value: string): string => value.trim().replace(/_+/g, ' ')
