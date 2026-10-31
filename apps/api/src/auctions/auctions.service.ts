import { Inject, Injectable } from '@nestjs/common'
import { auctionLots, jobRuns } from '@carplates/db'
import type { AuctionLot, AuctionResponse } from '@carplates/shared'
import { and, desc, eq, or } from 'drizzle-orm'

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
      checkedAt: run?.finishedAt?.toISOString() ?? null
    }
  }
}
