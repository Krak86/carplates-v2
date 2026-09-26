import { Inject, Injectable } from '@nestjs/common'
import { desc } from 'drizzle-orm'
import {
  statsByBody,
  statsByBrand,
  statsByBrandYear,
  statsByColor,
  statsByFuel,
  statsByKind,
  statsByModel,
  statsByOrigin,
  statsByRegion,
  statsByRegionYear,
  statsByYear,
  statsSummary
} from '@carplates/db'
import { statsResponseSchema } from '@carplates/shared'
import type { StatsResponse } from '@carplates/shared'

import { DbService } from '../db/db.service.js'

@Injectable()
export class StatsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async get(): Promise<StatsResponse> {
    const db = this.dbService.db
    const [
      summaryRows,
      byYear,
      byRegion,
      byRegionYear,
      byBody,
      byKind,
      byColor,
      byFuel,
      byBrand,
      byBrandYear,
      byOrigin,
      topModels
    ] = await Promise.all([
      db.select().from(statsSummary),
      db.select().from(statsByYear),
      db.select().from(statsByRegion),
      db.select().from(statsByRegionYear),
      db.select().from(statsByBody),
      db.select().from(statsByKind),
      db.select().from(statsByColor),
      db.select().from(statsByFuel),
      db.select().from(statsByBrand),
      db.select().from(statsByBrandYear),
      db.select().from(statsByOrigin),
      // Top 10 only — stats_by_model has ~79k mostly-noisy pairs, never sent in full (see its
      // migration). 10, not 5, so the web "top 5, show 10" toggle (TopStatsPanel) has data to expand into.
      db.select().from(statsByModel).orderBy(desc(statsByModel.distinctPlates)).limit(10)
    ])
    const summary = summaryRows[0]

    return statsResponseSchema.parse({
      summary: {
        totalRows: summary?.totalRows ?? 0,
        distinctPlates: summary?.distinctPlates ?? 0,
        distinctVins: summary?.distinctVins ?? 0,
        plateless: summary?.platelessCount ?? 0
      },
      byYear,
      byRegion,
      byRegionYear,
      byBody: byBody.map(row => ({ ...row, value: row.body })),
      byKind: byKind.map(row => ({ ...row, value: row.kind })),
      byColor: byColor.map(row => ({ ...row, value: row.color })),
      byFuel: byFuel.map(row => ({ ...row, value: row.fuel })),
      byBrand: byBrand.map(row => ({ ...row, value: row.brand })),
      byBrandYear,
      byOrigin: byOrigin.map(row => ({ ...row, value: row.origin })),
      topModels
    })
  }
}
