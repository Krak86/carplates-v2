import { z } from 'zod'

/**
 * A SETAM auction lot (seized / confiscated property, Cabinet Resolution 835) for a car or truck, from the data.gov.ua open
 * data (CC BY). Plate / VIN / make / model / year are parsed from the free-text title and null when it lacks them; the winner
 * is never stored. Own file: no offline-cache bust when it grows, so new fields must be `.nullable().optional()`.
 */
export const auctionLotSchema = z.object({
  lotNo: z.number(),
  proceedingNo: z.string().nullable(),
  /** Feed status, Ukrainian (`Торги відбулися`, `Торги не відбулися`, …): the card maps the known ones. */
  status: z.string(),
  category: z.string(),
  region: z.string().nullable(),
  startPrice: z.number().nullable(),
  salePrice: z.number().nullable(),
  /** Sold = the lot has a sale price (also true while awaiting payment / the act). */
  sold: z.boolean(),
  year: z.number().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  /** The lot title as published (free text). */
  title: z.string(),
  plate: z.string().nullable(),
  vin: z.string().nullable(),
  /** Which of the queried keys the lot matched. */
  matchedBy: z.enum(['plate', 'vin', 'both']),
  /** `YYYY-MM` of the monthly open-data file that last changed the lot: roughly when its auction ended (the feed has no exact date). */
  month: z.string().nullable().optional(),
  /** ISO timestamp the lot first appeared in our copy of the feed. */
  firstSeenAt: z.string(),
  /** ISO timestamp of its last real change (status / price). */
  updatedAt: z.string()
})
export type AuctionLot = z.infer<typeof auctionLotSchema>

export const auctionResponseSchema = z.object({
  /** At least one lot is sold (has a sale price). */
  anySold: z.boolean(),
  /** Newest lot first (a re-listed car gets a new lot number). */
  lots: z.array(auctionLotSchema),
  /** ISO timestamp of the last successful auction ingest run; null if it never ran. */
  checkedAt: z.string().nullable()
})
export type AuctionResponse = z.infer<typeof auctionResponseSchema>

/** A lot of the public `/auctions` list: the same fields as a card lot, without the plate / VIN match. */
export const auctionListLotSchema = auctionLotSchema.omit({ matchedBy: true })
export type AuctionListLot = z.infer<typeof auctionListLotSchema>

export const AUCTION_OUTCOMES = ['all', 'sold', 'open', 'notSold'] as const
export type AuctionOutcome = (typeof AUCTION_OUTCOMES)[number]
export const DEFAULT_AUCTION_OUTCOME: AuctionOutcome = 'all'

export const AUCTION_SORTS = ['newest', 'salePrice', 'startPrice', 'discount', 'year'] as const
export type AuctionSort = (typeof AUCTION_SORTS)[number]
export const DEFAULT_AUCTION_SORT: AuctionSort = 'newest'

export const AUCTION_PAGE_SIZE = 25

/** Query of `GET /api/auctions/lots` (the web builds it, the API parses it). Empty / absent = no filter. */
export const auctionListQuerySchema = z.object({
  make: z.string().trim().min(1).max(60).optional(),
  region: z.string().trim().min(1).max(60).optional(),
  outcome: z.enum(AUCTION_OUTCOMES).default(DEFAULT_AUCTION_OUTCOME),
  /** Start price bounds, hryvnias. */
  minPrice: z.coerce.number().min(0).max(1e10).optional(),
  maxPrice: z.coerce.number().min(0).max(1e10).optional(),
  sort: z.enum(AUCTION_SORTS).default(DEFAULT_AUCTION_SORT),
  /** Smallest first; the default is the largest / newest first. */
  asc: z
    .enum(['true', 'false'])
    .default('false')
    .transform(v => v === 'true'),
  page: z.coerce.number().int().min(1).max(10_000).default(1)
})
/** What the web sends (the schema's `z.input` is `unknown` for the coerced fields). */
export type AuctionListQuery = {
  make?: string
  region?: string
  outcome?: AuctionOutcome
  minPrice?: number
  maxPrice?: number
  sort?: AuctionSort
  asc?: 'true' | 'false'
  page?: number
}
export type AuctionListParams = z.output<typeof auctionListQuerySchema>

export const auctionListResponseSchema = z.object({
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  lots: z.array(auctionListLotSchema)
})
export type AuctionListResponse = z.infer<typeof auctionListResponseSchema>

/** One breakdown row of the `/auctions` stats. */
export const auctionStatsRowSchema = z.object({
  label: z.string(),
  lots: z.number(),
  sold: z.number(),
  open: z.number(),
  /** Mean of (sale / start - 1) over sold lots with a start price, in percent; null without any. */
  avgDeltaPercent: z.number().nullable(),
  /** Median sale price (UAH) of the sold lots; null without any. */
  medianSale: z.number().nullable()
})
export type AuctionStatsRow = z.infer<typeof auctionStatsRowSchema>

/** Aggregates for the `/auctions` page. Own contract: new fields must be `.nullable().optional()`. */
export const auctionStatsResponseSchema = z.object({
  summary: z.object({
    lots: z.number(),
    sold: z.number(),
    open: z.number(),
    withPlate: z.number(),
    withVin: z.number(),
    avgDeltaPercent: z.number().nullable(),
    medianSale: z.number().nullable(),
    medianStart: z.number().nullable(),
    /** Sum of the sale prices (UAH). */
    totalSale: z.number()
  }),
  /** `YYYY-MM` of the feed file that last changed the lot, ascending. */
  byMonth: z.array(auctionStatsRowSchema),
  byRegion: z.array(auctionStatsRowSchema),
  byMake: z.array(auctionStatsRowSchema),
  /** Vehicle model year, ascending. */
  byYear: z.array(auctionStatsRowSchema),
  /** ISO timestamp of the last successful auction ingest run; null if it never ran. */
  checkedAt: z.string().nullable()
})
export type AuctionStatsResponse = z.infer<typeof auctionStatsResponseSchema>

/** data.gov.ua page of the lot list, SETAM (organiser of the auctions) and Prozorro.Sale (the administrator of the e-auction system). */
export const AUCTIONS_DATASET_URL = 'https://data.gov.ua/dataset/eda4e3cf-0dda-46a1-a78a-ee264ebbfe97'
export const SETAM_URL = 'https://setam.net.ua/'
export const PROZORRO_SALE_URL = 'https://prozorro.sale/'

/**
 * SETAM page of one lot. The feed's `lotNo` is not the `/auction/{id}` id of the site (lot 608546 lives at `/auction/603050`),
 * but the site's server-side list filter by lot number returns exactly that lot, so this link needs no scraping.
 */
export function setamLotUrl(lotNo: number): string {
  return `${SETAM_URL}auctions/filters/number=${lotNo};`
}
