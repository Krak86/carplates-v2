import { Inject, Injectable } from '@nestjs/common'
import { openEv } from '@carplates/db'
import { makeKey, matchVdbModelAcrossMakes, vdbRelatedMakeKeys } from '@carplates/shared'
import type { OpenEvResponse } from '@carplates/shared'
import { asc, inArray, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

@Injectable()
export class EvService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /**
   * Electric / plug-in hybrid variants Open EV Data lists for the model (`pnpm ingest:open-ev`), oldest first. The file
   * carries no vehicle class, so any registry kind may match; the caller decides whether the car is electric at all.
   */
  async lookup(brand: string, model: string): Promise<OpenEvResponse> {
    const none: OpenEvResponse = { brand, model, match: null }
    const mk = makeKey(brand)
    if (!mk) return none

    const { db } = this.dbService
    const rows = await db
      .select()
      .from(openEv)
      .where(inArray(openEv.makeKey, vdbRelatedMakeKeys(mk, model)))
      .orderBy(sql`${openEv.releaseYear} asc nulls last`, asc(openEv.batteryKwh), asc(openEv.variant))
    const models = [...new Map(rows.map(r => [`${r.makeKey}/${r.modelKey}`, r])).values()].map(r => ({
      ...r,
      kind: 'any',
      aliases: []
    }))

    const found = matchVdbModelAcrossMakes(models, mk, model, ['any'])
    if (!found) return none

    const { row, how } = found
    const variants = rows
      .filter(r => r.makeKey === row.makeKey && r.modelKey === row.modelKey)
      .map(r => ({
        variant: r.variant,
        powertrain: r.powertrain === 'phev' ? ('phev' as const) : ('bev' as const),
        releaseYear: r.releaseYear,
        batteryKwh: r.batteryKwh,
        consumptionKwh100: r.consumptionKwh100,
        acMaxKw: r.acMaxKw,
        acPhases: r.acPhases,
        acPorts: r.acPorts ?? [],
        dcMaxKw: r.dcMaxKw,
        dcPorts: r.dcPorts ?? []
      }))

    return {
      brand,
      model,
      match: { makeName: row.make, modelName: row.model, how, crossMake: row.makeKey !== mk, variants }
    }
  }
}
