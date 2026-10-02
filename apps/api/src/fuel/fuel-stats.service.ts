import { Inject, Injectable } from '@nestjs/common'
import { fuelStatsResponseSchema } from '@carplates/shared'
import type { FuelStatsResponse } from '@carplates/shared'
import { sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

/** A brand/model needs this many matched cars to appear in a leaderboard — keeps one-off imports out of the rankings. */
const MIN_CARS_BRAND = 2000
const MIN_CARS_MODEL = 1500
const LEADERBOARD_SIZE = 15
const BAND_WIDTH_G_KM = 25

type RowShape = { label: string; n: number; matched: number; avgCo2: number | null }

/** Weighted mean over matched cars only, so unmatched groups never drag an average toward zero. */
const AVG = sql`(sum(co2_g_km * n) FILTER (WHERE co2_g_km IS NOT NULL) / NULLIF(sum(n) FILTER (WHERE co2_g_km IS NOT NULL), 0))::float8`
const COUNTS = sql`sum(n)::float8 AS n, (COALESCE(sum(n) FILTER (WHERE co2_g_km IS NOT NULL), 0))::float8 AS matched`

@Injectable()
export class FuelStatsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async get(): Promise<FuelStatsResponse> {
    const db = this.dbService.db
    const [overall, byYear, byBrand, byFuelClass, cleanest, dirtiest, distribution] = await Promise.all([
      db.execute<{ n: number; matched: number; avg: number | null }>(
        sql`SELECT ${COUNTS}, ${AVG} AS avg FROM registry.stats_fuel`
      ),
      db.execute<RowShape>(
        sql`SELECT make_year::text AS label, ${COUNTS}, ${AVG} AS "avgCo2" FROM registry.stats_fuel GROUP BY make_year ORDER BY make_year`
      ),
      db.execute<RowShape>(
        sql`SELECT brand AS label, ${COUNTS}, ${AVG} AS "avgCo2" FROM registry.stats_fuel GROUP BY brand
            HAVING sum(n) FILTER (WHERE co2_g_km IS NOT NULL) >= ${MIN_CARS_BRAND} ORDER BY 4 DESC LIMIT 60`
      ),
      db.execute<RowShape>(
        sql`SELECT fuel_class AS label, ${COUNTS}, ${AVG} AS "avgCo2" FROM registry.stats_fuel GROUP BY fuel_class ORDER BY 2 DESC`
      ),
      this.modelLeaderboard('ASC'),
      this.modelLeaderboard('DESC'),
      db.execute<{ from: number; n: number }>(
        sql`SELECT (floor(co2_g_km / ${BAND_WIDTH_G_KM}) * ${BAND_WIDTH_G_KM})::int AS "from", sum(n)::float8 AS n
            FROM registry.stats_fuel WHERE co2_g_km IS NOT NULL GROUP BY 1 ORDER BY 1`
      )
    ])

    const o = overall.rows[0]
    return fuelStatsResponseSchema.parse({
      total: o?.n ?? 0,
      matched: o?.matched ?? 0,
      fleetAvgCo2: o?.avg ?? null,
      byYear: byYear.rows,
      byBrand: byBrand.rows,
      byFuelClass: byFuelClass.rows,
      cleanestModels: cleanest,
      dirtiestModels: dirtiest,
      distribution: distribution.rows,
      bandWidth: BAND_WIDTH_G_KM
    })
  }

  async modelLeaderboard(
    direction: 'ASC' | 'DESC'
  ): Promise<{ brand: string; model: string; n: number; avgCo2: number }[]> {
    const order = direction === 'ASC' ? sql`ASC` : sql`DESC`
    const { rows } = await this.dbService.db.execute<{ brand: string; model: string; n: number; avgCo2: number }>(
      sql`SELECT brand, model, sum(n)::float8 AS n,
                 (sum(co2_g_km * n) / sum(n))::float8 AS "avgCo2"
          FROM registry.stats_fuel WHERE co2_g_km IS NOT NULL
          GROUP BY brand, model HAVING sum(n) >= ${MIN_CARS_MODEL}
          ORDER BY 4 ${order} LIMIT ${LEADERBOARD_SIZE}`
    )
    return rows
  }
}
