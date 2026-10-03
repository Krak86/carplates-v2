import { Inject, Injectable, Logger } from '@nestjs/common'
import { missedLookups } from '@carplates/db'
import { isUaPlate, isVin, normalizePlate } from '@carplates/shared'
import { sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

@Injectable()
export class MissedService {
  private readonly logger = new Logger(MissedService.name)

  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Fire-and-forget: a search that found nothing, stored only when it passes the plate/VIN format rules. */
  recordPlate(rawPlate: string): void {
    if (!isUaPlate(rawPlate)) return
    this.upsert('plate', normalizePlate(rawPlate))
  }

  recordVin(vin: string): void {
    if (!isVin(vin)) return
    this.upsert('vin', vin.replace(/\s+/g, '').toUpperCase())
  }

  private upsert(kind: 'plate' | 'vin', value: string): void {
    this.dbService.db
      .insert(missedLookups)
      .values({ kind, value })
      .onConflictDoUpdate({
        target: [missedLookups.kind, missedLookups.value],
        set: { hits: sql`${missedLookups.hits} + 1`, lastSeen: sql`now()` }
      })
      .then(
        () => undefined,
        (err: Error) => this.logger.warn(`Failed to record missed ${kind} lookup: ${err.message}`)
      )
  }
}
