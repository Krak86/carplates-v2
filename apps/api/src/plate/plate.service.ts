import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { currentRegistration, registrations } from '@carplates/db'
import { countOwners, hasImportOperation, normalizePlate, regionName } from '@carplates/shared'
import type { PlateHistoryResponse, PlateLookupResponse, Registration } from '@carplates/shared'
import { and, desc, eq, inArray, isNotNull, isNull, or, type SQL } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'
import { MissedService } from '../missed/missed.service.js'
import { toRegistrationDto } from './plate.dto.js'

@Injectable()
export class PlateService {
  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(MissedService) private readonly missed: MissedService
  ) {}

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
      this.missed.recordPlate(plate)
      throw new NotFoundException(`No registration found for plate ${plate}`)
    }

    const actions = await db
      .select({ operCode: registrations.operCode, operName: registrations.operName })
      .from(registrations)
      .where(this.identityFilter(plate, current.vin))

    // Owners and the import flag follow the vehicle, not the plate: with a VIN, use its whole history.
    const vehicleActions = current.vin ? await this.vehicleActions(current) : actions

    return {
      plate,
      region: regionName(plate) ?? null,
      current: toRegistrationDto(current),
      historyCount: actions.length || 1,
      ownersCount: countOwners(vehicleActions) || 1,
      everImported: hasImportOperation(vehicleActions)
    }
  }

  /**
   * Same set as the VIN page's registration history: the VIN's own rows plus the VIN-less rows of every plate it wore
   * (older rows, e.g. a customs import, carry no VIN) when brand and model match. Rows that merely share a plate with
   * another car are left out, so a reassigned plate neither adds owners nor an import.
   */
  private async vehicleActions(current: {
    vin: string | null
    brand: string | null
    model: string | null
  }): Promise<{ operCode: number | null; operName: string | null }[]> {
    const db = this.dbService.db
    const vinRows = await db
      .select({ operCode: registrations.operCode, operName: registrations.operName })
      .from(registrations)
      .where(eq(registrations.vin, current.vin!))
    if (!current.brand || !current.model) return vinRows
    const wornPlates = db
      .select({ plate: registrations.plate })
      .from(registrations)
      .where(and(eq(registrations.vin, current.vin!), isNotNull(registrations.plate)))
    const plateRows = await db
      .select({ operCode: registrations.operCode, operName: registrations.operName })
      .from(registrations)
      .where(
        and(
          inArray(registrations.plate, wornPlates),
          isNull(registrations.vin),
          eq(registrations.brand, current.brand),
          eq(registrations.model, current.model)
        )
      )
    return [...vinRows, ...plateRows]
  }

  /** The plate's current registration alone (one query), null when unknown — no history, no owner count, never recorded as missed. */
  async current(rawPlate: string): Promise<Registration | null> {
    const [row] = await this.dbService.db
      .select()
      .from(currentRegistration)
      .where(eq(currentRegistration.plate, normalizePlate(rawPlate)))
      .limit(1)
    return row ? toRegistrationDto(row) : null
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
