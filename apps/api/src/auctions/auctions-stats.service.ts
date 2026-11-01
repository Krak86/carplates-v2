import { Inject, Injectable } from '@nestjs/common'
import { jobRuns } from '@carplates/db'
import { AUCTION_PAGE_SIZE } from '@carplates/shared'
import type {
  AuctionListParams,
  AuctionListResponse,
  AuctionSort,
  AuctionSource,
  AuctionStatsResponse,
  AuctionStatsRow
} from '@carplates/shared'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

import { AUCTION_JOBS } from './auctions.service.js'
import { groupFilter, sourceFilter, unionLots, unionRowToLot } from './auctions-union.js'
import type { UnionRow } from './auctions-union.js'

const TOP = 100
const CACHE_MS = 10 * 60 * 1000
/** Status of a lot still running (registration open); kept in step with `OPEN_STATUS` of the web helpers. */
const OPEN_STATUS = 'Реєстрація учасників'

type RowOut = {
  label: string
  lots: number
  sold: number
  open: number
  avgDelta: number | null
  medianSale: number | null
}
type SummaryOut = {
  lots: number
  sold: number
  open: number
  withPlate: number
  withVin: number
  avgDelta: number | null
  medianSale: number | null
  medianStart: number | null
  totalSale: number | null
}
type RelistOut = { relisted: number; maxRounds: number | null }

const toRow = (r: RowOut): AuctionStatsRow => ({
  label: r.label,
  lots: Number(r.lots),
  sold: Number(r.sold),
  open: Number(r.open),
  avgDeltaPercent: r.avgDelta == null ? null : Math.round(Number(r.avgDelta) * 10) / 10,
  medianSale: r.medianSale == null ? null : Math.round(Number(r.medianSale))
})

/**
 * Sale vs start in percent, as the median over sold lots (named `avgDelta` in the contract, which keeps saved offline data valid):
 * a mean is ruined by symbolic starts (0.50 UAH sold at 100 000 UAH is +19 999 920 percent).
 */
const DELTA_MEDIAN = sql`(percentile_cont(0.5) WITHIN GROUP (ORDER BY (sale_price / start_price - 1) * 100)
  FILTER (WHERE sale_price IS NOT NULL AND start_price > 0))::float8`

/** Aggregate columns shared by every breakdown (a sold lot = it has a sale price). */
const AGGREGATES = sql`count(*)::int AS lots,
  (count(*) FILTER (WHERE sale_price IS NOT NULL))::int AS sold,
  (count(*) FILTER (WHERE sale_price IS NULL AND status = ${OPEN_STATUS}))::int AS open,
  ${DELTA_MEDIAN} AS "avgDelta",
  (percentile_cont(0.5) WITHIN GROUP (ORDER BY sale_price) FILTER (WHERE sale_price IS NOT NULL))::float8 AS "medianSale"`

/** Sort key per `sort` value: whitelisted SQL, never user input. Lots without the key sort last either way. */
const SORT_EXPR: Readonly<Record<AuctionSort, SQL>> = {
  newest: sql`l.when_at`,
  salePrice: sql`l.sale_price`,
  startPrice: sql`l.start_price`,
  discount: sql`(l.sale_price / nullif(l.start_price, 0))`,
  year: sql`l.year`
}

/** The union as a CTE `l`, narrowed to one source when asked. */
const lotsWhere = (source: AuctionSource | undefined): SQL => sql`WHERE ${sourceFilter(source) ?? sql`true`}`

@Injectable()
export class AuctionsStatsService {
  private cache = new Map<string, { at: number; value: AuctionStatsResponse }>()

  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private async checkedAt(): Promise<string | null> {
    const [run] = await this.dbService.db
      .select({ finishedAt: jobRuns.finishedAt })
      .from(jobRuns)
      .where(and(inArray(jobRuns.job, AUCTION_JOBS), eq(jobRuns.status, 'ok')))
      .orderBy(desc(jobRuns.startedAt))
      .limit(1)
    return run?.finishedAt?.toISOString() ?? null
  }

  /** Aggregates over every stored lot of both sources (or one), cached 10 minutes per source (the feeds change once a day). */
  async stats(source?: AuctionSource): Promise<AuctionStatsResponse> {
    const key = source ?? 'all'
    const now = Date.now()
    const hit = this.cache.get(key)
    if (hit && now - hit.at < CACHE_MS) return hit.value
    const { db } = this.dbService
    const scope = lotsWhere(source)

    const dim = (expr: string) =>
      db.execute<RowOut>(
        sql`WITH l AS (${unionLots})
            SELECT ${sql.raw(expr)} AS label, ${AGGREGATES}
            FROM l ${scope} AND ${sql.raw(expr)} IS NOT NULL
            GROUP BY 1 ORDER BY lots DESC, label LIMIT ${TOP}`
      )

    const [summary, relist, month, region, make, year, checkedAt] = await Promise.all([
      db.execute<SummaryOut>(
        sql`WITH l AS (${unionLots})
            SELECT count(*)::int AS lots,
                   (count(*) FILTER (WHERE sale_price IS NOT NULL))::int AS sold,
                   (count(*) FILTER (WHERE sale_price IS NULL AND status = ${OPEN_STATUS}))::int AS open,
                   (count(*) FILTER (WHERE plate IS NOT NULL))::int AS "withPlate",
                   (count(*) FILTER (WHERE vin IS NOT NULL))::int AS "withVin",
                   ${DELTA_MEDIAN} AS "avgDelta",
                   (percentile_cont(0.5) WITHIN GROUP (ORDER BY sale_price) FILTER (WHERE sale_price IS NOT NULL))::float8 AS "medianSale",
                   (percentile_cont(0.5) WITHIN GROUP (ORDER BY start_price) FILTER (WHERE start_price IS NOT NULL))::float8 AS "medianStart",
                   (sum(sale_price))::float8 AS "totalSale"
            FROM l ${scope}`
      ),
      // Proceedings exist on SETAM lots only: a Prozorro auction has no proceeding number and never counts here.
      db.execute<RelistOut>(
        sql`WITH l AS (${unionLots})
            SELECT (count(*) FILTER (WHERE n > 1))::int AS relisted, max(n)::int AS "maxRounds"
            FROM (SELECT count(*) AS n FROM l ${scope} AND proceeding_no IS NOT NULL GROUP BY proceeding_no) p`
      ),
      db.execute<RowOut>(
        sql`WITH l AS (${unionLots})
            SELECT to_char(when_at AT TIME ZONE 'UTC', 'YYYY-MM') AS label, ${AGGREGATES}
            FROM l ${scope}
            GROUP BY 1 ORDER BY 1`
      ),
      dim('region'),
      dim('make'),
      db.execute<RowOut>(
        sql`WITH l AS (${unionLots})
            SELECT year::text AS label, ${AGGREGATES}
            FROM l ${scope} AND year IS NOT NULL
            GROUP BY 1 ORDER BY 1`
      ),
      this.checkedAt()
    ])

    const s = summary.rows[0]
    const value: AuctionStatsResponse = {
      summary: {
        lots: Number(s?.lots ?? 0),
        sold: Number(s?.sold ?? 0),
        open: Number(s?.open ?? 0),
        withPlate: Number(s?.withPlate ?? 0),
        withVin: Number(s?.withVin ?? 0),
        avgDeltaPercent: s?.avgDelta == null ? null : Math.round(Number(s.avgDelta) * 10) / 10,
        medianSale: s?.medianSale == null ? null : Math.round(Number(s.medianSale)),
        medianStart: s?.medianStart == null ? null : Math.round(Number(s.medianStart)),
        totalSale: Math.round(Number(s?.totalSale ?? 0)),
        relistedProceedings: Number(relist.rows[0]?.relisted ?? 0),
        maxRounds: relist.rows[0]?.maxRounds == null ? null : Number(relist.rows[0].maxRounds)
      },
      byMonth: month.rows.map(toRow),
      byRegion: region.rows.map(toRow),
      byMake: make.rows.map(toRow),
      byYear: year.rows.map(toRow),
      checkedAt
    }
    this.cache.set(key, { at: now, value })
    return value
  }

  /** One page of lots of both sources matching the filters (parsed by `auctionListQuerySchema`), sorted; lots without the sort key last. */
  async list(query: AuctionListParams): Promise<AuctionListResponse> {
    const { db } = this.dbService
    const outcomeFilter: Record<string, SQL | undefined> = {
      all: undefined,
      sold: sql`l.sale_price IS NOT NULL`,
      open: sql`l.sale_price IS NULL AND l.status = ${OPEN_STATUS}`,
      notSold: sql`l.sale_price IS NULL AND l.status <> ${OPEN_STATUS}`
    }
    const conditions = [
      sourceFilter(query.source),
      groupFilter(query.group),
      query.auctionType ? sql`l.auction_type = ${query.auctionType}` : undefined,
      query.make ? sql`l.make = ${query.make}` : undefined,
      query.region ? sql`l.region = ${query.region}` : undefined,
      query.status ? sql`l.status = ${query.status}` : undefined,
      query.minPrice !== undefined ? sql`l.start_price >= ${query.minPrice}` : undefined,
      query.maxPrice !== undefined ? sql`l.start_price <= ${query.maxPrice}` : undefined,
      outcomeFilter[query.outcome]
    ].filter((c): c is SQL => !!c)
    const where = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``
    const direction = query.asc ? sql`ASC` : sql`DESC`
    const offset = (query.page - 1) * AUCTION_PAGE_SIZE

    const [rows, count] = await Promise.all([
      db.execute<UnionRow>(
        sql`WITH l AS (${unionLots})
            SELECT l.* FROM l ${where}
            ORDER BY ${SORT_EXPR[query.sort]} ${direction} NULLS LAST, l.when_at DESC, l.lot_no DESC NULLS LAST, l.auction_id DESC NULLS LAST
            LIMIT ${AUCTION_PAGE_SIZE} OFFSET ${offset}`
      ),
      db.execute<{ total: number }>(sql`WITH l AS (${unionLots}) SELECT count(*)::int AS total FROM l ${where}`)
    ])

    return {
      total: Number(count.rows[0]?.total ?? 0),
      page: query.page,
      pageSize: AUCTION_PAGE_SIZE,
      lots: rows.rows.map(unionRowToLot)
    }
  }
}
