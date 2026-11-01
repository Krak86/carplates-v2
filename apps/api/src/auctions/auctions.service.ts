import { Inject, Injectable } from '@nestjs/common'
import { auctionLots, jobRuns } from '@carplates/db'
import { MIN_PRICE_PEERS } from '@carplates/shared'
import type { AuctionLot, AuctionPriceCheck, AuctionResponse } from '@carplates/shared'
import { and, desc, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

import { unionLots, unionRowToLot } from './auctions-union.js'
import type { UnionRow } from './auctions-union.js'

/** Jobs that feed the lots; "checked at" is the newest successful run of either. */
export const AUCTION_JOBS = ['auctions', 'prozorro-auctions']

/** Newest lots returned per plate / VIN (both sources together). */
const LOOKUP_LIMIT = 50

@Injectable()
export class AuctionsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /**
   * Compares the newest sold lot with the other sold lots of the same make + model (and year when enough of them share it).
   * Lots of one car re-listed later are peers too: a few of them skew a thin sample, hence the `MIN_PRICE_PEERS` floor.
   */
  private async priceCheck(lots: readonly AuctionLot[]): Promise<AuctionPriceCheck | null> {
    const lot = lots.find(l => l.sold && l.salePrice !== null && l.make && l.model)
    if (!lot?.make || !lot.model || lot.salePrice === null || lot.lotNo === null) return null

    const { db } = this.dbService
    const lotNo = lot.lotNo
    const peers = async (year: number | null) => {
      const [row] = await db
        .select({
          peers: sql<number>`count(*)::int`,
          median: sql<number | null>`percentile_cont(0.5) within group (order by ${auctionLots.salePrice})::float8`
        })
        .from(auctionLots)
        .where(
          and(
            eq(auctionLots.make, lot.make as string),
            eq(auctionLots.model, lot.model as string),
            isNotNull(auctionLots.salePrice),
            ne(auctionLots.lotNo, lotNo),
            year === null ? undefined : eq(auctionLots.year, year)
          )
        )
      return { peers: row?.peers ?? 0, median: row?.median ?? null }
    }

    let year = lot.year
    let found = year === null ? { peers: 0, median: null } : await peers(year)
    if (found.peers < MIN_PRICE_PEERS) {
      year = null
      found = await peers(null)
    }
    if (found.peers < MIN_PRICE_PEERS || !found.median) return null

    return {
      lotNo,
      make: lot.make,
      model: lot.model,
      year,
      salePrice: lot.salePrice,
      peers: found.peers,
      medianSale: Math.round(found.median),
      deltaPercent: Math.round((lot.salePrice / found.median - 1) * 100)
    }
  }

  /**
   * Every lot of both sources (SETAM, Prozorro.Sale) whose plate or VIN equals the given one, newest first. `checkedAt` is the
   * finish of the last successful SETAM `auctions` job (a lot row's own `updated_at` only moves when the lot changed). A lot
   * plate that is also in the registry does not prove it is the same car today: the card says so.
   */
  async lookup(plate: string | null, vin: string | null): Promise<AuctionResponse> {
    const { db } = this.dbService
    const keys = [plate ? sql`l.plate = ${plate}` : undefined, vin ? sql`l.vin = ${vin}` : undefined].filter(
      (k): k is SQL => !!k
    )

    const [found, [run]] = await Promise.all([
      keys.length === 0
        ? { rows: [] as UnionRow[] }
        : db.execute<UnionRow>(
            sql`WITH l AS (${unionLots}) SELECT l.* FROM l WHERE ${sql.join(keys, sql` OR `)}
                ORDER BY l.when_at DESC, l.lot_no DESC NULLS LAST, l.auction_id DESC NULLS LAST LIMIT ${LOOKUP_LIMIT}`
          ),
      db
        .select({ finishedAt: jobRuns.finishedAt })
        .from(jobRuns)
        .where(and(inArray(jobRuns.job, AUCTION_JOBS), eq(jobRuns.status, 'ok')))
        .orderBy(desc(jobRuns.startedAt))
        .limit(1)
    ])

    const lots: AuctionLot[] = found.rows.map(r => {
      const plateHit = !!plate && r.plate === plate
      const vinHit = !!vin && r.vin === vin
      return { ...unionRowToLot(r), matchedBy: plateHit && vinHit ? 'both' : plateHit ? 'plate' : 'vin' }
    })

    return {
      anySold: lots.some(l => l.sold),
      lots,
      // SETAM lots only: the peers are SETAM sales (Prozorro prices come from other kinds of sellers and are not comparable).
      priceCheck: await this.priceCheck(lots.filter(l => l.source !== 'prozorro')),
      checkedAt: run?.finishedAt?.toISOString() ?? null
    }
  }
}
