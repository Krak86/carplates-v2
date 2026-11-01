import { PROZORRO_DOC_ID_RE, PROZORRO_STATUS_LABELS, prozorroAuctionUrl, setamLotUrl } from '@carplates/shared'
import type { AuctionGroup, AuctionListLot, AuctionSource, ProzorroSellerKind } from '@carplates/shared'
import { sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

/**
 * Both auction tables as one row set for the `/auctions` list, stats and plate / VIN lookup: SETAM lots (`auction_lots`) and
 * Prozorro.Sale auctions (`prozorro_auctions`) with the same columns. `status` is the SETAM wording (Prozorro statuses are mapped
 * from the shared `PROZORRO_STATUS_LABELS`, so "open" and "sold" mean one thing), `when_at` the date used for "newest" and the
 * month breakdown (SETAM: the last day of the month of the feed file that last changed the lot, the feed has nothing finer;
 * Prozorro: the start of the bidding). The Prozorro `grp` mirrors `auctionGroup` in the shared package, keep them together.
 */
const STATUS_CASE = sql.join(
  Object.entries(PROZORRO_STATUS_LABELS).map(([raw, label]) => sql`WHEN ${raw} THEN ${label}`),
  sql` `
)

/** `auctions-31-08-2024.csv` -> the last day of 2024-08 (UTC); null for any other file name. */
const SETAM_MONTH_END = sql`((to_date(substring(source_file from '\\d{2}-(\\d{2}-\\d{4})\\.csv$'), 'MM-YYYY') + interval '1 month' - interval '1 day') AT TIME ZONE 'UTC')`

export const unionLots: SQL = sql`
  SELECT 'setam'::text AS source,
         'setam'::text AS grp,
         lot_no::int AS lot_no,
         NULL::text AS auction_id,
         proceeding_no,
         status,
         NULL::text AS raw_status,
         category,
         region,
         start_price::float8 AS start_price,
         sale_price::float8 AS sale_price,
         year::int AS year,
         make,
         model,
         title_raw AS title,
         plate,
         vin,
         coalesce(${SETAM_MONTH_END}, first_seen_at) AS when_at,
         source_file,
         first_seen_at,
         updated_at,
         NULL::text AS selling_method, NULL::text AS seller_name, NULL::text AS seller_kind, NULL::text AS auction_type,
         NULL::timestamptz AS auction_start, NULL::float8 AS minimal_step, NULL::float8 AS guarantee,
         NULL::text AS color, NULL::int AS kilometrage, NULL::text AS fuel, NULL::int AS engine_cc,
         NULL::text AS transmission, NULL::text AS condition, NULL::boolean AS damaged, NULL::text AS damage_text,
         NULL::text AS locality, '[]'::jsonb AS photo_urls
  FROM registry.auction_lots
  UNION ALL
  SELECT 'prozorro'::text,
         CASE WHEN selling_method ~* '^(small|large)?privatization' THEN 'privatization'
              WHEN seller_kind IN ('bank', 'customs', 'bankruptcy', 'arma', 'commercial', 'lease') THEN seller_kind
              ELSE 'state' END,
         NULL::int,
         auction_id,
         NULL::text,
         CASE status ${STATUS_CASE} ELSE status END,
         status,
         NULL::text,
         region,
         value::float8,
         final_price::float8,
         year::int,
         make,
         model,
         title_raw,
         plate,
         vin,
         coalesce(auction_start, tender_start, source_modified_at),
         NULL::text,
         first_seen_at,
         updated_at,
         selling_method, seller_name, seller_kind, auction_type,
         auction_start, minimal_step::float8, guarantee::float8,
         color, kilometrage, fuel, engine_cc,
         transmission, condition, damaged, damage_text,
         locality, photo_urls
  FROM registry.prozorro_auctions`

/** `source` / `group` filters as SQL over the union (`l`), whitelisted values only. */
export const sourceFilter = (source: AuctionSource | undefined): SQL | undefined =>
  source ? sql`l.source = ${source}` : undefined
export const groupFilter = (group: AuctionGroup | undefined): SQL | undefined =>
  group ? sql`l.grp = ${group}` : undefined

/** One row of `unionLots` as the driver returns it (snake_case, `pg` types: numbers for float8 / int, Date for timestamptz, parsed jsonb). */
export type UnionRow = {
  source: AuctionSource
  grp: AuctionGroup
  lot_no: number | null
  auction_id: string | null
  proceeding_no: string | null
  status: string
  raw_status: string | null
  category: string | null
  region: string | null
  start_price: number | null
  sale_price: number | null
  year: number | null
  make: string | null
  model: string | null
  title: string
  plate: string | null
  vin: string | null
  when_at: Date | string
  source_file: string | null
  first_seen_at: Date | string
  updated_at: Date | string
  selling_method: string | null
  seller_name: string | null
  seller_kind: string | null
  auction_type: string | null
  auction_start: Date | string | null
  minimal_step: number | null
  guarantee: number | null
  color: string | null
  kilometrage: number | null
  fuel: string | null
  engine_cc: number | null
  transmission: string | null
  condition: string | null
  damaged: boolean | null
  damage_text: string | null
  locality: string | null
  photo_urls: string[] | null
}

/** `auctions-31-08-2024.csv` -> `2024-08`; null for any other file name. */
export const lotMonth = (sourceFile: string | null): string | null => {
  const m = sourceFile ? /^auctions-\d{2}-(\d{2})-(\d{4})\.csv$/.exec(sourceFile) : null
  return m ? `${m[2]}-${m[1]}` : null
}

const iso = (v: Date | string): string => new Date(v).toISOString()

/** Photo ids out of the stored document URLs: the last path segment, kept only when it is a 32-hex id. */
export function photoDocIds(urls: readonly string[] | null): string[] {
  const ids = (urls ?? []).map(u => u.split('/').pop() ?? '').filter(id => PROZORRO_DOC_ID_RE.test(id))
  return [...new Set(ids)]
}

/** A union row as a list lot (the card adds `matchedBy`). Prozorro: no lot number, no proceeding, `sold` = a winning award exists. */
export function unionRowToLot(r: UnionRow): AuctionListLot {
  const prozorro = r.source === 'prozorro' && r.auction_id !== null
  return {
    id: prozorro ? `prozorro:${r.auction_id}` : `setam:${r.lot_no}`,
    source: r.source,
    group: r.grp,
    lotNo: r.lot_no,
    auctionId: r.auction_id,
    url: prozorro ? prozorroAuctionUrl(r.auction_id as string) : r.lot_no === null ? null : setamLotUrl(r.lot_no),
    proceedingNo: r.proceeding_no,
    status: r.status,
    rawStatus: r.raw_status,
    // SETAM: the car category of the feed. Prozorro has none: the group stands in (the web shows the group chip).
    category: r.category ?? r.grp,
    region: r.region,
    startPrice: r.start_price,
    salePrice: r.sale_price,
    sold: r.sale_price !== null,
    year: r.year,
    make: r.make,
    model: r.model,
    title: r.title,
    plate: r.plate,
    vin: r.vin,
    month: lotMonth(r.source_file),
    firstSeenAt: iso(r.first_seen_at),
    updatedAt: iso(r.updated_at),
    sellerName: r.seller_name,
    sellerKind: (r.seller_kind as ProzorroSellerKind | null) ?? null,
    auctionType: r.auction_type,
    auctionStart: r.auction_start ? iso(r.auction_start) : null,
    minimalStep: r.minimal_step,
    guarantee: r.guarantee,
    color: r.color,
    kilometrage: r.kilometrage,
    fuel: r.fuel,
    engineCc: r.engine_cc,
    transmission: r.transmission,
    condition: r.condition,
    damaged: r.damaged,
    damageText: r.damage_text,
    locality: r.locality,
    photos: photoDocIds(r.photo_urls)
  }
}
