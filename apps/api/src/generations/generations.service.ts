import { Inject, Injectable } from '@nestjs/common'
import { modelGenerations } from '@carplates/db'
import { makeKey, matchVdbModelAcrossMakes, pickGeneration, vdbRelatedMakeKeys } from '@carplates/shared'
import type { Generation, GenerationsResponse } from '@carplates/shared'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

export type LocatedGenerations = {
  /** The matched catalogue model: its keys address other `model_*` tables. */
  row: { makeKey: string; modelKey: string; make: string; model: string }
  how: 'exact' | 'alias' | 'series' | 'prefix'
  list: Generation[]
  crossMake: boolean
}

@Injectable()
export class GenerationsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /**
   * Generations of the model (`pnpm ingest:generations`) and the one containing `year`. A model with generations but no
   * span for the year still answers, with `current` null, so the UI can decide to show nothing.
   */
  async generations(brand: string, model: string, year?: number): Promise<GenerationsResponse> {
    const none: GenerationsResponse = { brand, model, year: year ?? null, match: null }
    const located = await this.locate(brand, model)
    if (!located) return none
    const { row, how, list, crossMake } = located

    const current = year ? pickGeneration(list, year) : null
    const at = current ? list.indexOf(current) : -1
    return {
      brand,
      model,
      year: year ?? null,
      match: {
        makeName: row.make,
        modelName: row.model,
        how,
        crossMake,
        current,
        previous: at > 0 ? list[at - 1]! : null,
        next: at >= 0 ? (list[at + 1] ?? null) : null,
        boundary: !!current && !!year && year === current.yearFrom && at > 0 && list[at - 1]!.yearTo === year,
        total: list.length
      }
    }
  }

  /** The catalogue model a registry make/model matches (the shared VehiclesDB matcher) with all its generations, oldest first. */
  async locate(brand: string, model: string): Promise<LocatedGenerations | null> {
    const mk = makeKey(brand)
    if (!mk) return null

    const { db } = this.dbService
    const models = (
      await db
        .select({
          makeKey: modelGenerations.makeKey,
          modelKey: modelGenerations.modelKey,
          make: sql<string>`max(${modelGenerations.make})`,
          model: sql<string>`max(${modelGenerations.model})`
        })
        .from(modelGenerations)
        .where(inArray(modelGenerations.makeKey, vdbRelatedMakeKeys(mk, model)))
        .groupBy(modelGenerations.makeKey, modelGenerations.modelKey)
    ).map(r => ({ ...r, kind: 'any', aliases: [] }))

    const found = matchVdbModelAcrossMakes(models, mk, model, ['any'])
    if (!found) return null

    const { row, how } = found
    const rows = await db
      .select()
      .from(modelGenerations)
      .where(and(eq(modelGenerations.makeKey, row.makeKey), eq(modelGenerations.modelKey, row.modelKey)))
      .orderBy(asc(modelGenerations.yearFrom))
    const list: Generation[] = rows.map(r => ({
      code: r.code,
      label: r.label,
      yearFrom: r.yearFrom,
      yearTo: r.yearTo,
      bodyStyles: r.bodyStyles,
      platform: r.platform,
      wikiTitle: r.wikiTitle
    }))
    return { row, how, list, crossMake: row.makeKey !== mk }
  }
}
