import { Inject, Injectable } from '@nestjs/common'
import {
  statsByBody,
  statsByBrand,
  statsByBrandYear,
  statsByColor,
  statsByFuel,
  statsByKind,
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
    const [summaryRows, byYear, byRegion, byRegionYear, byBody, byKind, byColor, byFuel, byBrand, byBrandYear] =
      await Promise.all([
        db.select().from(statsSummary),
        db.select().from(statsByYear),
        db.select().from(statsByRegion),
        db.select().from(statsByRegionYear),
        db.select().from(statsByBody),
        db.select().from(statsByKind),
        db.select().from(statsByColor),
        db.select().from(statsByFuel),
        db.select().from(statsByBrand),
        db.select().from(statsByBrandYear)
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
      byBrandYear
    })
  }
}
