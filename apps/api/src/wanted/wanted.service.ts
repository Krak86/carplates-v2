import { Inject, Injectable } from '@nestjs/common'
import { wantedVehicles } from '@carplates/db'
import type { WantedRecord, WantedResponse } from '@carplates/shared'
import { desc, eq, or, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

@Injectable()
export class WantedService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /**
   * Every record (current and removed) whose plate or VIN equals the given one. `checkedAt` / `trackedSince` describe our own
   * snapshots of the feed (`pnpm ingest:wanted`): a vehicle that left the feed before the first run is only in the history if the stolen.in.ua backfill
   * (`pnpm ingest:wanted-history`) found it; then `trackedSince` is the earliest scraped theft date.
   */
  async lookup(plate: string | null, vin: string | null): Promise<WantedResponse> {
    const { db } = this.dbService
    const keys = [
      plate ? eq(wantedVehicles.plate, plate) : undefined,
      vin ? eq(wantedVehicles.vin, vin) : undefined,
      vin ? eq(wantedVehicles.vinAlt, vin) : undefined
    ]
    const where = or(...keys)

    const [rows, [meta]] = await Promise.all([
      where
        ? db
            .select()
            .from(wantedVehicles)
            .where(where)
            .orderBy(sql`${wantedVehicles.resolvedAt} is not null`, desc(wantedVehicles.seizedAt))
            .limit(50)
        : [],
      db
        .select({
          checkedAt: sql<Date | null>`max(${wantedVehicles.lastSeenAt})`,
          trackedSince: sql<Date | null>`min(${wantedVehicles.firstSeenAt})`,
          historySince: sql<
            string | null
          >`min(${wantedVehicles.seizedAt}) filter (where ${wantedVehicles.source} = 'stolen.in.ua' and ${wantedVehicles.seizedAt} >= '2020-08-01')`
        })
        .from(wantedVehicles)
    ])

    const vinMatches = (r: { vin: string | null; vinAlt: string | null }): boolean =>
      !!vin && (r.vin === vin || r.vinAlt === vin)

    const records: WantedRecord[] = rows.map(r => ({
      id: r.sourceId,
      status: r.resolvedAt ? 'removed' : 'wanted',
      matchedBy: plate && r.plate === plate ? (vinMatches(r) ? 'both' : 'plate') : 'vin',
      plate: r.plate,
      vin: r.vin,
      brand: r.brand,
      model: r.model,
      vehicleType: r.vehicleType,
      color: r.color,
      seizedAt: r.seizedAt,
      registeredAt: r.registeredAt,
      organUnit: r.organUnit,
      removedAt: r.resolvedAt?.toISOString() ?? null,
      source: r.source === 'stolen.in.ua' ? 'stolen.in.ua' : 'feed',
      removedExact: r.resolvedExact
    }))
    const historySince = meta?.historySince ?? null

    return {
      wanted: records.some(r => r.status === 'wanted'),
      records,
      checkedAt: meta?.checkedAt ? new Date(meta.checkedAt).toISOString() : null,
      trackedSince: historySince
        ? new Date(historySince).toISOString()
        : meta?.trackedSince
          ? new Date(meta.trackedSince).toISOString()
          : null,
      historySource: historySince ? 'stolen.in.ua' : null
    }
  }
}
