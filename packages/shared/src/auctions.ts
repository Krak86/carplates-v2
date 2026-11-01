import { z } from 'zod'

/** Where a lot comes from. A lot without `source` (offline data saved before Prozorro.Sale was added) is a SETAM lot. */
export const AUCTION_SOURCES = ['setam', 'prozorro'] as const
export type AuctionSource = (typeof AUCTION_SOURCES)[number]
export const DEFAULT_AUCTION_SOURCE: AuctionSource = 'setam'

/** Auction types of a Prozorro.Sale lot: `english` (price rises), `dutch` (price falls), `withoutAuction`, `priorityEnglish`. */
export const AUCTION_TYPES = ['english', 'dutch', 'withoutAuction', 'priorityEnglish'] as const
export type AuctionType = (typeof AUCTION_TYPES)[number]

/** Seller kinds of a Prozorro.Sale auction (`scripts/src/prozorro-parse.ts` derives it at ingest from the seller and Prozorro's own tags). */
export const PROZORRO_SELLER_KINDS = ['bank', 'customs', 'bankruptcy', 'arma', 'state', 'commercial', 'lease'] as const
export type ProzorroSellerKind = (typeof PROZORRO_SELLER_KINDS)[number]

/**
 * Subcategories of the lot list, in presentation order. SETAM lots form their own group, Prozorro lots follow their seller
 * (small privatization is told apart by the selling method, the rest of `state` is alienation and company property).
 */
export const AUCTION_GROUPS = [
  'setam',
  'customs',
  'bankruptcy',
  'privatization',
  'state',
  'bank',
  'arma',
  'commercial',
  'lease'
] as const
export type AuctionGroup = (typeof AUCTION_GROUPS)[number]

export function auctionGroup(
  source: AuctionSource,
  sellerKind: string | null | undefined,
  sellingMethod: string | null | undefined
): AuctionGroup {
  if (source === 'setam') return 'setam'
  if (/^(?:small|large)?privatization/i.test(sellingMethod ?? '')) return 'privatization'
  return (PROZORRO_SELLER_KINDS as readonly string[]).includes(sellerKind ?? '')
    ? (sellerKind as ProzorroSellerKind)
    : 'state'
}

/**
 * Prozorro auction status -> the SETAM status wording the lot list and card already know (`uaAuctions.status.*`), so the open /
 * sold / not-sold logic is one. A status not listed is shown as published. `rawStatus` keeps the original.
 */
export const PROZORRO_STATUS_LABELS: Readonly<Record<string, string>> = {
  active_rectification: 'Реєстрація учасників',
  active_tendering: 'Реєстрація учасників',
  // bidding is over, the winner is being qualified: still undecided, so it counts as open
  active_qualification: 'Реєстрація учасників',
  active_awarded: 'Складання акту',
  pending_payment: 'Очікування сплати',
  complete: 'Торги відбулися',
  unsuccessful: 'Торги не відбулися',
  cancelled: 'Торги припинено'
}
export const prozorroStatusLabel = (status: string): string => PROZORRO_STATUS_LABELS[status] ?? status

/** Public page of one Prozorro.Sale auction. The ID is the full one with its prefix (`BRE001-UA-...`); without it the page is a 404. */
export const prozorroAuctionUrl = (auctionId: string): string => `https://prozorro.sale/auction/${auctionId}/`

/** Document store of Prozorro.Sale: photos are content-addressed and public. The API resizer takes only the 32-hex id. */
export const PROZORRO_DOCUMENT_BASE = 'https://procedure.prozorro.sale/api/documents/public/'
export const PROZORRO_DOC_ID_RE = /^[0-9a-f]{32}$/
export const prozorroDocumentUrl = (docId: string): string => `${PROZORRO_DOCUMENT_BASE}${docId}`

/**
 * A SETAM auction lot (seized / confiscated property, Cabinet Resolution 835) for a car or truck, from the data.gov.ua open
 * data (CC BY). Plate / VIN / make / model / year are parsed from the free-text title and null when it lacks them; the winner
 * is never stored. Own file: no offline-cache bust when it grows, so new fields must be `.nullable().optional()`.
 */
export const auctionLotSchema = z.object({
  /** Stable key across both sources: `setam:<lotNo>` or `prozorro:<auctionId>`. Absent in data saved before Prozorro.Sale. */
  id: z.string().nullable().optional(),
  /** Absent / `setam` = SETAM. */
  source: z.enum(AUCTION_SOURCES).nullable().optional(),
  group: z.enum(AUCTION_GROUPS).nullable().optional(),
  /** SETAM lot number; null for a Prozorro.Sale auction (its key is `auctionId`). */
  lotNo: z.number().nullable(),
  /** Prozorro.Sale only: the full auction ID and the public page of the auction. */
  auctionId: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
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
  updatedAt: z.string(),
  // Prozorro.Sale only from here (all absent on SETAM lots). Own file: new fields stay `.nullable().optional()`.
  /** Seller as published (arbitration manager, customs office, bank, state company ...). */
  sellerName: z.string().nullable().optional(),
  sellerKind: z.enum(PROZORRO_SELLER_KINDS).nullable().optional(),
  /** `english` (price rises), `dutch` (price falls), `withoutAuction`, `priorityEnglish`. */
  auctionType: z.string().nullable().optional(),
  /** Prozorro status as published (`active_tendering`, `complete`, `unsuccessful` ...): the web maps it to a label. */
  rawStatus: z.string().nullable().optional(),
  /** ISO start of the bidding. */
  auctionStart: z.string().nullable().optional(),
  minimalStep: z.number().nullable().optional(),
  guarantee: z.number().nullable().optional(),
  color: z.string().nullable().optional(),
  kilometrage: z.number().nullable().optional(),
  fuel: z.string().nullable().optional(),
  engineCc: z.number().nullable().optional(),
  transmission: z.string().nullable().optional(),
  condition: z.string().nullable().optional(),
  damaged: z.boolean().nullable().optional(),
  damageText: z.string().nullable().optional(),
  locality: z.string().nullable().optional(),
  /** Photo document ids (32 hex), see `prozorroDocumentUrl`; newest upload order as published. */
  photos: z.array(z.string()).nullable().optional()
})
export type AuctionLot = z.infer<typeof auctionLotSchema>

/**
 * The newest sold lot of the car against the other sold lots of the same make and model (same year when at least
 * `MIN_PRICE_PEERS` of them exist). Computed from our own copy of the feed; the lot itself is excluded.
 */
export const auctionPriceCheckSchema = z.object({
  lotNo: z.number(),
  make: z.string(),
  model: z.string(),
  /** Set when the peers share the model year, null when they are the whole make + model. */
  year: z.number().nullable(),
  salePrice: z.number(),
  peers: z.number(),
  medianSale: z.number(),
  /** (salePrice / medianSale - 1) in percent: positive = this car sold above the median. */
  deltaPercent: z.number()
})
export type AuctionPriceCheck = z.infer<typeof auctionPriceCheckSchema>

/** Fewest sold peers a price check needs. */
export const MIN_PRICE_PEERS = 3

/** Vehicle fields where SETAM (parsed title) and Prozorro (structured props) can disagree; the merge flags them instead of picking silently. */
export const VEHICLE_CONFLICT_FIELDS = ['make', 'model', 'year'] as const
export type VehicleConflictField = (typeof VEHICLE_CONFLICT_FIELDS)[number]

/**
 * The car behind a plate / VIN lookup as one block, built from all its lots: each field once, a Prozorro structured value wins
 * over a SETAM parsed title, inside one source the newest lot wins. Own contract: new fields stay `.nullable().optional()`.
 */
export const auctionVehicleSchema = z.object({
  plate: z.string().nullable(),
  vin: z.string().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  year: z.number().nullable(),
  color: z.string().nullable(),
  kilometrage: z.number().nullable(),
  fuel: z.string().nullable(),
  engineCc: z.number().nullable(),
  transmission: z.string().nullable(),
  condition: z.string().nullable(),
  damaged: z.boolean().nullable(),
  damageText: z.string().nullable(),
  /** Fields where the sources disagree, each with the value every source gave (the first entry is the one shown above). */
  conflicts: z.array(
    z.object({
      field: z.enum(VEHICLE_CONFLICT_FIELDS),
      values: z.array(z.object({ source: z.enum(AUCTION_SOURCES), value: z.union([z.string(), z.number()]) }))
    })
  )
})
export type AuctionVehicle = z.infer<typeof auctionVehicleSchema>

export const auctionResponseSchema = z.object({
  /** Merged facts of the car, null / absent without lots. */
  vehicle: auctionVehicleSchema.nullable().optional(),
  /** At least one lot is sold (has a sale price). */
  anySold: z.boolean(),
  /** Newest lot first (a re-listed car gets a new lot number). */
  lots: z.array(auctionLotSchema),
  /** Null / absent without a sold lot that has make, model and enough sold peers. */
  priceCheck: auctionPriceCheckSchema.nullable().optional(),
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
  /** Both sources unless set. */
  source: z.enum(AUCTION_SOURCES).optional(),
  group: z.enum(AUCTION_GROUPS).optional(),
  /** Prozorro lots only (SETAM lots have none, so a type filter drops them). */
  auctionType: z.enum(AUCTION_TYPES).optional(),
  make: z.string().trim().min(1).max(60).optional(),
  region: z.string().trim().min(1).max(60).optional(),
  /** Feed status as published (`Торги відбулися`, …), exact match. */
  status: z.string().trim().min(1).max(60).optional(),
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
  source?: AuctionSource
  group?: AuctionGroup
  auctionType?: AuctionType
  make?: string
  region?: string
  status?: string
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
    totalSale: z.number(),
    /** Proceedings that produced more than one lot (a car re-listed after a failed round). */
    relistedProceedings: z.number().nullable().optional(),
    /** Most lots in one proceeding. */
    maxRounds: z.number().nullable().optional()
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
