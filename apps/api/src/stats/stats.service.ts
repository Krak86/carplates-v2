import { createHash } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import { desc, max } from 'drizzle-orm'
import {
  cncapRatings,
  euroncapRatings,
  iihsRatings,
  ingestedResources,
  jncapRatings,
  kncapRatings,
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
import { dataVersionResponseSchema, statsResponseSchema } from '@carplates/shared'
import type { DataVersionResponse, StatsResponse } from '@carplates/shared'

import { DbService } from '../db/db.service.js'

@Injectable()
export class StatsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Clients key their offline cache on this. `totalRows` covers `db:refresh-stats`/`db:seed`, which touch no timestamps. */
  async version(): Promise<DataVersionResponse> {
    const db = this.dbService.db
    const markers = await Promise.all([
      db.select({ v: max(ingestedResources.ingestedAt) }).from(ingestedResources),
      db.select({ v: statsSummary.totalRows }).from(statsSummary),
      db.select({ v: max(euroncapRatings.scrapedAt) }).from(euroncapRatings),
      db.select({ v: max(jncapRatings.scrapedAt) }).from(jncapRatings),
      db.select({ v: max(cncapRatings.scrapedAt) }).from(cncapRatings),
      db.select({ v: max(kncapRatings.scrapedAt) }).from(kncapRatings),
      db.select({ v: max(iihsRatings.scrapedAt) }).from(iihsRatings)
    ])
    const raw = markers
      .map(rows => {
        const v = rows[0]?.v
        return v instanceof Date ? v.toISOString() : String(v ?? '')
      })
      .join('|')
    return dataVersionResponseSchema.parse({ dataVersion: createHash('sha1').update(raw).digest('hex').slice(0, 16) })
  }

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
