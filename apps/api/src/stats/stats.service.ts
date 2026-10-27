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
  statsModelGrouped,
  statsByOrigin,
  statsOrigin,
  statsByRegion,
  statsByRegionYear,
  statsByYear,
  statsDistribution,
  statsEv,
  statsImports,
  statsSizeModels,
  statsSummary
} from '@carplates/db'
import {
  DISTRIBUTION_BUCKET_WIDTH,
  dataVersionResponseSchema,
  distributionResponseSchema,
  evStatsResponseSchema,
  importsStatsResponseSchema,
  mergeBodyStats,
  originStatsResponseSchema,
  sizeModelsResponseSchema,
  statsFieldResponseSchema,
  statsResponseSchema,
  statsTopResponseSchema,
  SPEC_METRICS,
  SPEC_METRIC_COLUMN,
  WEIGHT_GROUPS
} from '@carplates/shared'
import type {
  DataVersionResponse,
  DistributionMetric,
  DistributionResponse,
  EvStatsResponse,
  Histogram,
  ImportsStatsResponse,
  OriginStatsResponse,
  SizeModelsResponse,
  StatsFieldDimension,
  StatsFieldResponse,
  StatsResponse,
  SpecBoard,
  StatsTopResponse,
  WeightBoard,
  WeightKindGroup
} from '@carplates/shared'

import { DbService } from '../db/db.service.js'
import { FuelStatsService } from '../fuel/fuel-stats.service.js'
import { SafetyStatsService } from '../safety/safety-stats.service.js'
import { foldOriginStats } from './stats-origin.js'

// Leaderboard depth — must match MAX_TOP_N in apps/web/src/routes/stats/helpers.ts.
const TOP_N = 10
/** A model needs this many registered vehicles to enter the weight boards: passenger cars match the fuel model boards' floor, the rarer kinds a lower one. */
const MIN_PASSENGER_WEIGHT_MODEL = 1500
const MIN_OTHER_WEIGHT_MODEL = 200
/** Same floor for the spec boards (passenger cars only). */
const MIN_SPEC_MODEL = 500
/** Pure-electric models listed in the EV article. */
const EV_TOP_MODELS = 15
/** Imported models and VIN build countries listed in the imports article. */
const IMPORT_TOP_MODELS = 15
const IMPORT_TOP_COUNTRIES = 15

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

  /** Fleet histograms (power, hp/tonne, engine size) of passenger cars; the client turns one into a percentile. */
  async distribution(): Promise<DistributionResponse> {
    const rows = await this.dbService.db.select().from(statsDistribution).orderBy(statsDistribution.bucket)
    const histogram = (metric: DistributionMetric): Histogram => ({
      width: DISTRIBUTION_BUCKET_WIDTH[metric],
      buckets: rows.filter(r => r.metric === metric).map(r => [r.bucket, r.n] as [number, number])
    })
    return distributionResponseSchema.parse({
      power_kw: histogram('power_kw'),
      hp_per_tonne: histogram('hp_per_tonne'),
      displacement_cc: histogram('displacement_cc')
    })
  }

  /** Electrified passenger cars by model year, region and model (a rollup rebuilt by `db:refresh-ev-stats`); 'all' rows are the whole fleet. */
  async ev(): Promise<EvStatsResponse> {
    const rows = await this.dbService.db.select().from(statsEv)
    const split = (): { bev: number; hybrid: number } => ({ bev: 0, hybrid: 0 })
    const total = split()
    let fleet = 0
    const years = new Map<number, { bev: number; hybrid: number; fleet: number }>()
    const regions = new Map<string, { bev: number; hybrid: number; fleet: number }>()
    const models = new Map<string, { brand: string; model: string; n: number; firstYear: number }>()
    for (const r of rows) {
      const year = years.get(r.makeYear) ?? { ...split(), fleet: 0 }
      const region = r.region ? (regions.get(r.region) ?? { ...split(), fleet: 0 }) : null
      if (r.powertrain === 'all') {
        fleet += r.n
        year.fleet += r.n
        if (region) region.fleet += r.n
      } else if (r.powertrain === 'bev' || r.powertrain === 'hybrid') {
        total[r.powertrain] += r.n
        year[r.powertrain] += r.n
        if (region) region[r.powertrain] += r.n
        if (r.powertrain === 'bev') {
          const key = `${r.brand}|${r.model}`
          const m = models.get(key) ?? { brand: r.brand, model: r.model, n: 0, firstYear: r.makeYear }
          m.n += r.n
          m.firstYear = Math.min(m.firstYear, r.makeYear)
          models.set(key, m)
        }
      }
      years.set(r.makeYear, year)
      if (region && r.region) regions.set(r.region, region)
    }
    return evStatsResponseSchema.parse({
      total,
      fleet,
      byYear: [...years.entries()].map(([year, v]) => ({ year, ...v })).sort((a, b) => a.year - b.year),
      byRegion: [...regions.entries()]
        .map(([region, v]) => ({ region, ...v }))
        .sort((a, b) => b.bev + b.hybrid - (a.bev + a.hybrid)),
      topModels: [...models.values()].sort((a, b) => b.n - a.n).slice(0, EV_TOP_MODELS)
    })
  }

  /** Used imports vs dealer sales by year, import countries (VIN) and models (a rollup rebuilt by `db:refresh-imports-stats`). */
  async imports(): Promise<ImportsStatsResponse> {
    const rows = await this.dbService.db.select().from(statsImports)
    const total = { import: 0, dealer: 0 }
    const years = new Map<number, { import: number; dealer: number }>()
    const countries = new Map<string, number>()
    const models = new Map<string, { brand: string; model: string; n: number }>()
    for (const r of rows) {
      if (r.origin !== 'import' && r.origin !== 'dealer') continue
      total[r.origin] += r.n
      const year = years.get(r.regYear) ?? { import: 0, dealer: 0 }
      year[r.origin] += r.n
      years.set(r.regYear, year)
      if (r.origin !== 'import') continue
      countries.set(r.country, (countries.get(r.country) ?? 0) + r.n)
      const key = `${r.brand}|${r.model}`
      const m = models.get(key) ?? { brand: r.brand, model: r.model, n: 0 }
      m.n += r.n
      models.set(key, m)
    }
    return importsStatsResponseSchema.parse({
      total,
      byYear: [...years.entries()].map(([year, v]) => ({ year, ...v })).sort((a, b) => a.year - b.year),
      byCountry: [...countries.entries()]
        .map(([country, n]) => ({ country, n }))
        .sort((a, b) => b.n - a.n)
        .slice(0, IMPORT_TOP_COUNTRIES),
      topModels: [...models.values()].sort((a, b) => b.n - a.n).slice(0, IMPORT_TOP_MODELS)
    })
  }

  /** Passenger cars by brand home country and VIN assembly country (a rollup rebuilt by `db:refresh-origin-stats`). */
  async origin(): Promise<OriginStatsResponse> {
    const rows = await this.dbService.db.select().from(statsOrigin)
    return originStatsResponseSchema.parse(foldOriginStats(rows))
  }

  /** Per-model body + dimensions behind the /read explainers and the size explorer (a rollup rebuilt by `db:refresh-spec-stats`). */
  async sizeModels(): Promise<SizeModelsResponse> {
    const rows = await this.dbService.db.select().from(statsSizeModels).orderBy(desc(statsSizeModels.n))
    return sizeModelsResponseSchema.parse({ models: rows })
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
      weightBoards,
      specBoards
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
      db.select().from(statsModelGrouped).orderBy(desc(statsModelGrouped.distinctPlates)).limit(TOP_N),
      this.fuelStats.modelLeaderboard('ASC'),
      this.fuelStats.modelLeaderboard('DESC'),
      this.safetyStats.modelLeaderboard('DESC'),
      this.safetyStats.modelLeaderboard('ASC'),
      this.weightBoards(),
      this.specBoards()
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
      weightBoards,
      specBoards
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

  /** Highest and lowest passenger-car models per spec metric from the small `stats_spec` rollup (power, displacement, height, length, fuel tank). */
  private async specBoards(): Promise<Record<string, SpecBoard>> {
    const { rows } = await this.dbService.db.execute<{
      metric: string
      brand: string
      model: string
      n: number
      minVal: number
      maxVal: number
    }>(
      sql`SELECT metric, brand, model, n, min_val::float8 AS "minVal", max_val::float8 AS "maxVal"
          FROM registry.stats_spec WHERE n >= ${MIN_SPEC_MODEL}`
    )
    const boards: Record<string, SpecBoard> = {}
    for (const metric of SPEC_METRICS) {
      const list = rows.filter(r => r.metric === SPEC_METRIC_COLUMN[metric].key)
      if (list.length === 0) continue
      boards[metric] = {
        highest: [...list]
          .sort((a, b) => b.maxVal - a.maxVal || b.n - a.n)
          .slice(0, TOP_N)
          .map(r => ({ brand: r.brand, model: r.model, n: r.n, value: r.maxVal })),
        lowest: [...list]
          .sort((a, b) => a.minVal - b.minVal || b.n - a.n)
          .slice(0, TOP_N)
          .map(r => ({ brand: r.brand, model: r.model, n: r.n, value: r.minVal }))
      }
    }
    return boards
  }

  /** One free-text dimension's full rollup (a few dozen rows) — the ResultCard "?" popover data. */
  async field(dimension: StatsFieldDimension): Promise<StatsFieldResponse> {
    const db = this.dbService.db
    switch (dimension) {
      case 'body':
        return statsFieldResponseSchema.parse(
          mergeBodyStats(await db.select().from(statsByBody)).map(r => ({ ...r, value: r.body }))
        )
      case 'kind':
        return statsFieldResponseSchema.parse((await db.select().from(statsByKind)).map(r => ({ ...r, value: r.kind })))
      case 'color':
        return statsFieldResponseSchema.parse(
          (await db.select().from(statsByColor)).map(r => ({ ...r, value: r.color }))
        )
      case 'fuel':
        return statsFieldResponseSchema.parse((await db.select().from(statsByFuel)).map(r => ({ ...r, value: r.fuel })))
      case 'year':
        return statsFieldResponseSchema.parse(
          (await db.select().from(statsByYear)).map(r => ({ ...r, value: r.year === null ? null : String(r.year) }))
        )
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
      // Top 10 only — stats_model_grouped has ~75k mostly-noisy pairs, never sent in full (see its
      // migration). 10, not 5, so the web "top 5, show 10" toggle (TopStatsPanel) has data to expand into.
      db.select().from(statsModelGrouped).orderBy(desc(statsModelGrouped.distinctPlates)).limit(10)
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
      byBody: mergeBodyStats(byBody).map(row => ({ ...row, value: row.body })),
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
