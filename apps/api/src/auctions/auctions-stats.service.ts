import { Inject, Injectable } from '@nestjs/common'
import { auctionLots, jobRuns } from '@carplates/db'
import { AUCTION_PAGE_SIZE } from '@carplates/shared'
import type {
  AuctionListLot,
  AuctionListParams,
  AuctionListResponse,
  AuctionSort,
  AuctionStatsResponse,
  AuctionStatsRow
} from '@carplates/shared'
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

import { lotMonth } from './auctions.service.js'

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

const toRow = (r: RowOut): AuctionStatsRow => ({
  label: r.label,
  lots: Number(r.lots),
  sold: Number(r.sold),
  open: Number(r.open),
  avgDeltaPercent: r.avgDelta == null ? null : Math.round(Number(r.avgDelta) * 10) / 10,
  medianSale: r.medianSale == null ? null : Math.round(Number(r.medianSale))
})

/** Aggregate columns shared by every breakdown (a sold lot = it has a sale price). */
const AGGREGATES = sql`count(*)::int AS lots,
  (count(*) FILTER (WHERE sale_price IS NOT NULL))::int AS sold,
  (count(*) FILTER (WHERE sale_price IS NULL AND status = ${OPEN_STATUS}))::int AS open,
  (avg((sale_price / start_price - 1) * 100) FILTER (WHERE sale_price IS NOT NULL AND start_price > 0))::float8 AS "avgDelta",
  (percentile_cont(0.5) WITHIN GROUP (ORDER BY sale_price) FILTER (WHERE sale_price IS NOT NULL))::float8 AS "medianSale"`

/** Sort key per `sort` value: whitelisted SQL, never user input. Lots without the key sort last either way. */
const SORT_EXPR: Readonly<Record<AuctionSort, SQL>> = {
  newest: sql`lot_no`,
  salePrice: sql`sale_price`,
  startPrice: sql`start_price`,
  discount: sql`(sale_price / nullif(start_price, 0))`,
  year: sql`year`
}

@Injectable()
export class AuctionsStatsService {
  private cache: { at: number; value: AuctionStatsResponse } | null = null

  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private async checkedAt(): Promise<string | null> {
    const [run] = await this.dbService.db
      .select({ finishedAt: jobRuns.finishedAt })
      .from(jobRuns)
      .where(and(eq(jobRuns.job, 'auctions'), eq(jobRuns.status, 'ok')))
      .orderBy(desc(jobRuns.startedAt))
      .limit(1)
    return run?.finishedAt?.toISOString() ?? null
  }

  /** Aggregates over every stored lot, cached 10 minutes (the feed changes once a day). */
  async stats(): Promise<AuctionStatsResponse> {
    const now = Date.now()
    if (this.cache && now - this.cache.at < CACHE_MS) return this.cache.value
    const { db } = this.dbService

    const dim = (expr: string) =>
      db.execute<RowOut>(
        sql`SELECT ${sql.raw(expr)} AS label, ${AGGREGATES}
            FROM registry.auction_lots
            WHERE ${sql.raw(expr)} IS NOT NULL
            GROUP BY 1 ORDER BY lots DESC, label LIMIT ${TOP}`
      )

    const [summary, month, region, make, year, checkedAt] = await Promise.all([
      db.execute<SummaryOut>(
        sql`SELECT count(*)::int AS lots,
                   (count(*) FILTER (WHERE sale_price IS NOT NULL))::int AS sold,
                   (count(*) FILTER (WHERE sale_price IS NULL AND status = ${OPEN_STATUS}))::int AS open,
                   (count(*) FILTER (WHERE plate IS NOT NULL))::int AS "withPlate",
                   (count(*) FILTER (WHERE vin IS NOT NULL))::int AS "withVin",
                   (avg((sale_price / start_price - 1) * 100) FILTER (WHERE sale_price IS NOT NULL AND start_price > 0))::float8 AS "avgDelta",
                   (percentile_cont(0.5) WITHIN GROUP (ORDER BY sale_price) FILTER (WHERE sale_price IS NOT NULL))::float8 AS "medianSale",
                   (percentile_cont(0.5) WITHIN GROUP (ORDER BY start_price) FILTER (WHERE start_price IS NOT NULL))::float8 AS "medianStart",
                   (sum(sale_price))::float8 AS "totalSale"
            FROM registry.auction_lots`
      ),
      db.execute<RowOut>(
        sql`SELECT regexp_replace(source_file, '^auctions-\\d{2}-(\\d{2})-(\\d{4})\\.csv$', '\\2-\\1') AS label, ${AGGREGATES}
            FROM registry.auction_lots
            WHERE source_file ~ '^auctions-\\d{2}-\\d{2}-\\d{4}\\.csv$'
            GROUP BY 1 ORDER BY 1`
      ),
      dim('region'),
      dim('make'),
      db.execute<RowOut>(
        sql`SELECT year::text AS label, ${AGGREGATES}
            FROM registry.auction_lots WHERE year IS NOT NULL
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
        totalSale: Math.round(Number(s?.totalSale ?? 0))
      },
      byMonth: month.rows.map(toRow),
      byRegion: region.rows.map(toRow),
      byMake: make.rows.map(toRow),
      byYear: year.rows.map(toRow),
      checkedAt
    }
    this.cache = { at: now, value }
    return value
  }

  /** One page of lots matching the filters (parsed by `auctionListQuerySchema`), sorted; lots without the sort key last. */
  async list(query: AuctionListParams): Promise<AuctionListResponse> {
    const { db } = this.dbService
    const outcomeFilter: Record<string, SQL | undefined> = {
      all: undefined,
      sold: sql`${auctionLots.salePrice} IS NOT NULL`,
      open: sql`${auctionLots.salePrice} IS NULL AND ${auctionLots.status} = ${OPEN_STATUS}`,
      notSold: sql`${auctionLots.salePrice} IS NULL AND ${auctionLots.status} <> ${OPEN_STATUS}`
    }
    const where = and(
      query.make ? eq(auctionLots.make, query.make) : undefined,
      query.region ? eq(auctionLots.region, query.region) : undefined,
      query.status ? eq(auctionLots.status, query.status) : undefined,
      query.minPrice !== undefined ? gte(auctionLots.startPrice, query.minPrice) : undefined,
      query.maxPrice !== undefined ? lte(auctionLots.startPrice, query.maxPrice) : undefined,
      outcomeFilter[query.outcome]
    )
    const direction = query.asc ? sql`ASC` : sql`DESC`
    const offset = (query.page - 1) * AUCTION_PAGE_SIZE

    const [rows, [count]] = await Promise.all([
      db
        .select()
        .from(auctionLots)
        .where(where)
        .orderBy(sql`${SORT_EXPR[query.sort]} ${direction} NULLS LAST`, desc(auctionLots.lotNo))
        .limit(AUCTION_PAGE_SIZE)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(auctionLots)
        .where(where)
    ])

    const lots: AuctionListLot[] = rows.map(r => ({
      lotNo: r.lotNo,
      proceedingNo: r.proceedingNo,
      status: r.status,
      category: r.category,
      region: r.region,
      startPrice: r.startPrice,
      salePrice: r.salePrice,
      sold: r.salePrice !== null,
      year: r.year,
      make: r.make,
      model: r.model,
      title: r.titleRaw,
      plate: r.plate,
      vin: r.vin,
      month: lotMonth(r.sourceFile),
      firstSeenAt: r.firstSeenAt.toISOString(),
      updatedAt: r.updatedAt.toISOString()
    }))

    return { total: Number(count?.total ?? 0), page: query.page, pageSize: AUCTION_PAGE_SIZE, lots }
  }
}
