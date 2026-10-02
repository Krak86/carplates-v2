import { Inject, Injectable } from '@nestjs/common'
import { fuelEconomy } from '@carplates/db'
import { MAX_YEAR_GAP, makeKey, matchModelRows, modelKey, selectFuelEstimate } from '@carplates/shared'
import type { FuelEconomyResponse } from '@carplates/shared'
import { and, between, eq } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

type Query = { make: string; model: string; year: number; fuel?: string; capacity?: number }

@Injectable()
export class FuelService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Matching lives in `@carplates/shared` (`matchModelRows` + `selectFuelEstimate`) — the stats rollup uses the same code. */
  async estimate(query: Query): Promise<FuelEconomyResponse> {
    const { make, model, year } = query
    const mk = makeKey(make)
    const mdl = modelKey(model)
    if (!mk || !mdl) return { make, model, year, estimate: null }

    const makeRows = await this.dbService.db
      .select()
      .from(fuelEconomy)
      .where(and(eq(fuelEconomy.makeKey, mk), between(fuelEconomy.modelYear, year - MAX_YEAR_GAP, year + MAX_YEAR_GAP)))

    const estimate = selectFuelEstimate(matchModelRows(makeRows, mdl), {
      year,
      fuel: query.fuel,
      capacity: query.capacity
    })
    return { make, model, year, estimate }
  }
}
