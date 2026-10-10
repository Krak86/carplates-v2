import { Inject, Injectable } from '@nestjs/common'
import { caRecallModels, caRecalls } from '@carplates/db'
import { CA_RECALLS_LIMIT, makeKey, matchVdbModelAcrossMakes, vdbRelatedMakeKeys } from '@carplates/shared'
import type { CaRecallsResponse } from '@carplates/shared'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

@Injectable()
export class CaRecallsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /**
   * Canadian recall campaigns without a US twin for the model (`pnpm ingest:ca-recalls`), newest first. With a `year`, a
   * campaign shows only when it covers that model year (or records no year at all).
   */
  async recalls(brand: string, model: string, year?: number): Promise<CaRecallsResponse> {
    const none: CaRecallsResponse = { brand, model, year: year ?? null, match: null }
    const mk = makeKey(brand)
    if (!mk) return none

    const { db } = this.dbService
    const models = (
      await db
        .select({
          makeKey: caRecallModels.makeKey,
          modelKey: caRecallModels.modelKey,
          make: sql<string>`max(${caRecallModels.make})`,
          model: sql<string>`max(${caRecallModels.model})`
        })
        .from(caRecallModels)
        .where(inArray(caRecallModels.makeKey, vdbRelatedMakeKeys(mk, model)))
        .groupBy(caRecallModels.makeKey, caRecallModels.modelKey)
    ).map(r => ({ ...r, kind: 'any', aliases: [] }))

    const found = matchVdbModelAcrossMakes(models, mk, model, ['any'])
    if (!found) return none

    const { row, how } = found
    const links = await db
      .select({ recall: caRecalls, modelYear: caRecallModels.modelYear })
      .from(caRecallModels)
      .innerJoin(caRecalls, eq(caRecalls.recallNumber, caRecallModels.recallNumber))
      .where(and(eq(caRecallModels.makeKey, row.makeKey), eq(caRecallModels.modelKey, row.modelKey)))
      .orderBy(desc(caRecalls.recalledAt), desc(caRecalls.recallNumber))

    // One entry per campaign with the model years it covers; a year filter keeps campaigns covering it (or recording none).
    const byCode = new Map<string, { recall: (typeof links)[number]['recall']; years: Set<number> }>()
    for (const { recall, modelYear } of links) {
      const e = byCode.get(recall.recallNumber) ?? { recall, years: new Set<number>() }
      if (modelYear > 0) e.years.add(modelYear)
      byCode.set(recall.recallNumber, e)
    }
    const rows = [...byCode.values()].filter(e => !year || e.years.size === 0 || e.years.has(year))
    if (rows.length === 0) return none

    return {
      brand,
      model,
      year: year ?? null,
      match: {
        makeName: row.make,
        modelName: row.model,
        how,
        crossMake: row.makeKey !== mk,
        total: rows.length,
        recalls: rows.slice(0, CA_RECALLS_LIMIT).map(({ recall, years }) => ({
          code: recall.recallNumber,
          publishedAt: recall.recalledAt,
          notification: recall.notification,
          category: recall.category,
          system: recall.system,
          manufacturerNo: recall.mfrRecallNo,
          text: recall.comment,
          units: recall.units,
          years: [...years].sort((a, b) => a - b)
        }))
      }
    }
  }
}
