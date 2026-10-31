import { Inject, Injectable } from '@nestjs/common'
import { auctionLots, jobRuns } from '@carplates/db'
import { MIN_PRICE_PEERS } from '@carplates/shared'
import type { AuctionLot, AuctionPriceCheck, AuctionResponse } from '@carplates/shared'
import { and, desc, eq, isNotNull, ne, or, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

/** `auctions-31-08-2024.csv` -> `2024-08`; null for any other file name. */
export const lotMonth = (sourceFile: string): string | null => {
  const m = /^auctions-\d{2}-(\d{2})-(\d{4})\.csv$/.exec(sourceFile)
  return m ? `${m[2]}-${m[1]}` : null
}

@Injectable()
export class AuctionsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /**
   * Every lot whose parsed plate or VIN equals the given one, newest lot number first. `checkedAt` is the finish of the last
   * successful `auctions` job (a lot row's own `updated_at` only moves when the lot changed). A lot plate that is also in the
   * registry does not prove it is the same car today: the card says so.
   */
  /**
   * Compares the newest sold lot with the other sold lots of the same make + model (and year when enough of them share it).
   * Lots of one car re-listed later are peers too: a few of them skew a thin sample, hence the `MIN_PRICE_PEERS` floor.
   */
  private async priceCheck(lots: readonly AuctionLot[]): Promise<AuctionPriceCheck | null> {
    const lot = lots.find(l => l.sold && l.salePrice !== null && l.make && l.model)
    if (!lot?.make || !lot.model || lot.salePrice === null) return null

    const { db } = this.dbService
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
            ne(auctionLots.lotNo, lot.lotNo),
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
      lotNo: lot.lotNo,
      make: lot.make,
      model: lot.model,
      year,
      salePrice: lot.salePrice,
      peers: found.peers,
      medianSale: Math.round(found.median),
      deltaPercent: Math.round((lot.salePrice / found.median - 1) * 100)
    }
  }

  async lookup(plate: string | null, vin: string | null): Promise<AuctionResponse> {
    const { db } = this.dbService
    const where = or(plate ? eq(auctionLots.plate, plate) : undefined, vin ? eq(auctionLots.vin, vin) : undefined)

    const [rows, [run]] = await Promise.all([
      where ? db.select().from(auctionLots).where(where).orderBy(desc(auctionLots.lotNo)).limit(50) : [],
      db
        .select({ finishedAt: jobRuns.finishedAt })
        .from(jobRuns)
        .where(and(eq(jobRuns.job, 'auctions'), eq(jobRuns.status, 'ok')))
        .orderBy(desc(jobRuns.startedAt))
        .limit(1)
    ])

    const lots: AuctionLot[] = rows.map(r => {
      const plateHit = !!plate && r.plate === plate
      const vinHit = !!vin && r.vin === vin
      return {
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
        matchedBy: plateHit && vinHit ? 'both' : plateHit ? 'plate' : 'vin',
        month: lotMonth(r.sourceFile),
        firstSeenAt: r.firstSeenAt.toISOString(),
        updatedAt: r.updatedAt.toISOString()
      }
    })

    return {
      anySold: lots.some(l => l.sold),
      lots,
      priceCheck: await this.priceCheck(lots),
      checkedAt: run?.finishedAt?.toISOString() ?? null
    }
  }
}
