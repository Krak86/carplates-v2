import type { AuctionStatsRow } from '@carplates/shared'

export const AUCTION_DIMENSIONS = ['region', 'make', 'year', 'month'] as const
export type AuctionDimension = (typeof AUCTION_DIMENSIONS)[number]

// Explicit, not LIST[0]: order is presentation, the default is semantics.
export const DEFAULT_AUCTION_DIMENSION: AuctionDimension = 'region'

export const AUCTION_DIMENSION_ICONS: Readonly<Record<AuctionDimension, string>> = {
  region: '🗺️',
  make: '🏭',
  year: '📅',
  month: '🗓️'
}

/** Dimensions whose rows can open the lot list filtered to that value. */
export type FilterableDimension = Extract<AuctionDimension, 'region' | 'make'>

export const AUCTION_COLUMNS = ['label', 'lots', 'sold', 'soldPercent', 'avgDeltaPercent', 'medianSale'] as const
export type AuctionColumn = (typeof AUCTION_COLUMNS)[number]

/** A breakdown row plus its sold share (0-100), so the table can sort on it. */
export type AuctionTableRow = AuctionStatsRow & { soldPercent: number }
