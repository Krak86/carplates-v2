import { createHash } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import { desc, isNotNull, max, sql } from 'drizzle-orm'
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
import {
  dataVersionResponseSchema,
  statsFieldResponseSchema,
  statsResponseSchema,
  statsTopResponseSchema,
  WEIGHT_GROUPS
} from '@carplates/shared'
import type {
  DataVersionResponse,
  StatsFieldDimension,
  StatsFieldResponse,
  StatsResponse,
  StatsTopResponse,
  WeightBoard,
  WeightKindGroup
} from '@carplates/shared'

import { DbService } from '../db/db.service.js'
import { FuelStatsService } from '../fuel/fuel-stats.service.js'
import { SafetyStatsService } from '../safety/safety-stats.service.js'

// Leaderboard depth — must match MAX_TOP_N in apps/web/src/routes/stats/helpers.ts.
const TOP_N = 10
/** A model needs this many registered vehicles to enter the weight boards: passenger cars match the fuel model boards' floor, the rarer kinds a lower one. */
const MIN_PASSENGER_WEIGHT_MODEL = 1500
const MIN_OTHER_WEIGHT_MODEL = 200

@Injectable()
export class StatsService {
  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(FuelStatsService) private readonly fuelStats: FuelStatsService,
    @Inject(SafetyStatsService) private readonly safetyStats: SafetyStatsService
  ) {}

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

  /** The ranking-chip leaderboards only: registry top 10s (null values excluded — same rule as the web's `topLabels`) + fuel/crash model boards. */
  async top(): Promise<StatsTopResponse> {
    const db = this.dbService.db
    const [
      byBrand,
      byColor,
      byRegion,
      topModels,
      cleanestModels,
      dirtiestModels,
      safestModels,
      leastSafeModels,
      weightBoards
    ] = await Promise.all([
      db
        .select()
        .from(statsByBrand)
        .where(isNotNull(statsByBrand.brand))
        .orderBy(desc(statsByBrand.distinctPlates))
        .limit(TOP_N),
      db
        .select()
        .from(statsByColor)
        .where(isNotNull(statsByColor.color))
        .orderBy(desc(statsByColor.distinctPlates))
        .limit(TOP_N),
      db.select().from(statsByRegion).orderBy(desc(statsByRegion.distinctPlates)).limit(TOP_N),
      db.select().from(statsByModel).orderBy(desc(statsByModel.distinctPlates)).limit(TOP_N),
      this.fuelStats.modelLeaderboard('ASC'),
      this.fuelStats.modelLeaderboard('DESC'),
      this.safetyStats.modelLeaderboard('DESC'),
      this.safetyStats.modelLeaderboard('ASC'),
      this.weightBoards()
    ])
    return statsTopResponseSchema.parse({
      byBrand: byBrand.map(row => ({ ...row, value: row.brand })),
      byColor: byColor.map(row => ({ ...row, value: row.color })),
      byRegion,
      topModels,
      cleanestModels,
      dirtiestModels,
      safestModels,
      leastSafeModels,
      weightBoards
    })
  }

  /**
   * The heaviest and lightest models of every weight group (and of all of them together) from the small `stats_weight`
   * rollup — heaviest by the model's top edge mass, lightest by its bottom edge; the per-group vehicle floor keeps
   * one-off imports out.
   */
  private async weightBoards(): Promise<Record<string, WeightBoard>> {
    const { rows } = await this.dbService.db.execute<{
      kindGroup: WeightKindGroup
      brand: string
      model: string
      n: number
      minKg: number
      maxKg: number
    }>(
      sql`SELECT kind_group AS "kindGroup", brand, model, n, min_kg::float8 AS "minKg", max_kg::float8 AS "maxKg"
          FROM registry.stats_weight`
    )
    const ranked = rows.filter(
      r => r.n >= (r.kindGroup === 'passenger' ? MIN_PASSENGER_WEIGHT_MODEL : MIN_OTHER_WEIGHT_MODEL)
    )
    const board = (list: typeof ranked): WeightBoard => ({
      heaviest: [...list]
        .sort((a, b) => b.maxKg - a.maxKg || b.n - a.n)
        .slice(0, TOP_N)
        .map(r => ({ brand: r.brand, model: r.model, n: r.n, weightKg: r.maxKg, group: r.kindGroup })),
      lightest: [...list]
        .sort((a, b) => a.minKg - b.minKg || b.n - a.n)
        .slice(0, TOP_N)
        .map(r => ({ brand: r.brand, model: r.model, n: r.n, weightKg: r.minKg, group: r.kindGroup }))
    })
    return Object.fromEntries(
      WEIGHT_GROUPS.map(g => [g, board(g === 'all' ? ranked : ranked.filter(r => r.kindGroup === g))])
    )
  }

  /** One free-text dimension's full rollup (a few dozen rows) — the ResultCard "?" popover data. */
  async field(dimension: StatsFieldDimension): Promise<StatsFieldResponse> {
    const db = this.dbService.db
    switch (dimension) {
      case 'body':
        return statsFieldResponseSchema.parse((await db.select().from(statsByBody)).map(r => ({ ...r, value: r.body })))
      case 'kind':
        return statsFieldResponseSchema.parse((await db.select().from(statsByKind)).map(r => ({ ...r, value: r.kind })))
      case 'color':
        return statsFieldResponseSchema.parse(
          (await db.select().from(statsByColor)).map(r => ({ ...r, value: r.color }))
        )
      case 'fuel':
        return statsFieldResponseSchema.parse((await db.select().from(statsByFuel)).map(r => ({ ...r, value: r.fuel })))
    }
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
