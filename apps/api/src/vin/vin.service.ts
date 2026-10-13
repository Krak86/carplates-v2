import { BadGatewayException, BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { registrations } from '@carplates/db'
import { isVin } from '@carplates/shared'
import type { VinDecodeResponse, VinRegistry } from '@carplates/shared'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'
import { loadEnv } from '../env.js'
import { MissedService } from '../missed/missed.service.js'
import { toRegistrationDto } from '../plate/plate.dto.js'

interface NhtsaResult {
  Variable?: string
  Value?: string | null
}

const CACHE_MAX = 500

@Injectable()
export class VinService {
  private readonly base = loadEnv().NHTSA_BASE_URL
  /** VIN decodes are immutable — a plain bounded map is enough until Redis (Phase 4). Registry data is not cached here: it's a local DB read, and it changes with every ingest. */
  private readonly cache = new Map<string, VinDecodeResponse>()

  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(MissedService) private readonly missed: MissedService
  ) {}

  async decode(rawVin: string): Promise<VinDecodeResponse> {
    const vin = rawVin.trim().toUpperCase()
    if (!isVin(vin)) {
      throw new BadRequestException(`"${rawVin}" is not a valid 17-character VIN`)
    }

    const registry = await this.lookupRegistry(vin)
    if (!registry) this.missed.recordVin(vin)
    const cached = this.cache.get(vin)
    if (cached) return { ...cached, registry }

    const url = `${this.base}/decodevin/${encodeURIComponent(vin)}?format=json`
    let payload: { Results?: NhtsaResult[] }
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`status ${res.status}`)
      payload = (await res.json()) as { Results?: NhtsaResult[] }
    } catch (err) {
      throw new BadGatewayException(`NHTSA decode failed: ${(err as Error).message}`)
    }

    const results = (payload.Results ?? []).flatMap(r =>
      r.Variable && r.Value != null && r.Value !== '' ? [{ variable: r.Variable, value: r.Value }] : []
    )

    if (results.length === 0 && !registry) {
      throw new NotFoundException(`No decode data for VIN ${vin}`)
    }

    const response: VinDecodeResponse = { vin, results }
    this.remember(vin, response)
    return { ...response, registry }
  }

  /** Our own registry rows for this VIN, e.g. a plateless 2026 action (ГСЦ МВС order №67/ОД). */
  private async lookupRegistry(vin: string): Promise<VinRegistry | undefined> {
    const db = this.dbService.db
    const vinRows = await db
      .select()
      .from(registrations)
      .where(eq(registrations.vin, vin))
      .orderBy(desc(registrations.dReg), desc(registrations.id))

    if (vinRows.length === 0) return undefined

    // Older rows (e.g. a customs import) often carry no VIN, only the plate the car wore then. Pull in the VIN-less
    // rows of every plate this VIN wore, when brand and model match, so a plate reassigned to another car stays out.
    // A VIN-less row adds no new plate, so one hop reaches everything there is.
    const plates = [...new Set(vinRows.map(r => r.plate).filter((p): p is string => !!p))]
    const brand = vinRows.find(r => r.brand)?.brand
    const model = vinRows.find(r => r.model)?.model
    const plateRows =
      plates.length && brand && model
        ? await db
            .select()
            .from(registrations)
            .where(
              and(
                inArray(registrations.plate, plates),
                isNull(registrations.vin),
                eq(registrations.brand, brand),
                eq(registrations.model, model)
              )
            )
        : []
    const rows = [...vinRows, ...plateRows].sort((a, b) => (b.dReg ?? '').localeCompare(a.dReg ?? '') || b.id - a.id)

    const latest = rows[0]
    return {
      plate: latest?.plate ?? null,
      plateInferred: latest?.plateInferred ?? false,
      actions: rows.map(toRegistrationDto)
    }
  }

  private remember(vin: string, value: VinDecodeResponse): void {
    if (this.cache.size >= CACHE_MAX) {
      const oldest = this.cache.keys().next().value
      if (oldest !== undefined) this.cache.delete(oldest)
    }
    this.cache.set(vin, value)
  }
}
