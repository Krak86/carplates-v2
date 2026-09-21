import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { currentRegistration, registrations } from '@carplates/db'
import { normalizePlate, regionName } from '@carplates/shared'
import type { PlateHistoryResponse, PlateLookupResponse } from '@carplates/shared'
import { and, desc, eq, isNull, or, sql, type SQL } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'
import { toRegistrationDto } from './plate.dto.js'

@Injectable()
export class PlateService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /**
   * Match this exact plate, plus — when it has a VIN — any row that shares
   * that VIN but carries no plate of its own. That second half is what makes a
   * 2026 action (ГСЦ МВС order №67/ОД dropped the plate column) reachable from
   * a plate search: the row has no plate to match on directly.
   */
  private identityFilter(plate: string, vin: string | null): SQL {
    if (!vin) return eq(registrations.plate, plate)
    return or(eq(registrations.plate, plate), and(isNull(registrations.plate), eq(registrations.vin, vin))) as SQL
  }

  async lookup(rawPlate: string): Promise<PlateLookupResponse> {
    const plate = normalizePlate(rawPlate)
    const db = this.dbService.db

    const [current] = await db.select().from(currentRegistration).where(eq(currentRegistration.plate, plate)).limit(1)

    if (!current) {
      throw new NotFoundException(`No registration found for plate ${plate}`)
    }

    const [counted] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(registrations)
      .where(this.identityFilter(plate, current.vin))

    return {
      plate,
      region: regionName(plate) ?? null,
      current: toRegistrationDto(current),
      historyCount: counted?.count ?? 1
    }
  }

  async history(rawPlate: string): Promise<PlateHistoryResponse> {
    const plate = normalizePlate(rawPlate)
    const db = this.dbService.db

    const [current] = await db
      .select({ vin: currentRegistration.vin })
      .from(currentRegistration)
      .where(eq(currentRegistration.plate, plate))
      .limit(1)

    const rows = await db
      .select()
      .from(registrations)
      .where(this.identityFilter(plate, current?.vin ?? null))
      .orderBy(desc(registrations.dReg), desc(registrations.id))

    if (rows.length === 0) {
      throw new NotFoundException(`No registration history for plate ${plate}`)
    }

    return {
      plate,
      region: regionName(plate) ?? null,
      actions: rows.map(toRegistrationDto)
    }
  }
}
