import { Injectable, NotFoundException } from '@nestjs/common'
import { currentRegistration, registrations } from '@carplates/db'
import { normalizePlate, regionName } from '@carplates/shared'
import type { PlateHistoryResponse, PlateLookupResponse } from '@carplates/shared'
import { desc, eq, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'
import { toRegistrationDto } from './plate.dto.js'

@Injectable()
export class PlateService {
  constructor(private readonly dbService: DbService) {}

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
      .where(eq(registrations.plate, plate))

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

    const rows = await db
      .select()
      .from(registrations)
      .where(eq(registrations.plate, plate))
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
