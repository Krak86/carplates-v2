import { Inject, Injectable } from '@nestjs/common'
import { FUEL_CLASSES, powertrainStatsResponseSchema } from '@carplates/shared'
import type { FuelClass, PowertrainBrand, PowertrainModel, PowertrainStatsResponse } from '@carplates/shared'
import { sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

const TOP_MODELS = 50
const TOP_BRANDS = 30
const RARE_MODELS = 30
/** A model needs this many cars to count as "rare" rather than registry noise (one-off imports, typos). */
const RARE_MIN_CARS = 5
const FIRST_YEAR = 2000
const YEARS_SHOWN = 15

type SummaryRow = { fuelClass: FuelClass; n: number; brands: number; models: number; avgCo2: number | null }
type ModelRow = {
  fuelClass: FuelClass
  brand: string
  model: string
  n: number
  total: number
  cls: number
  isTop: boolean
  isRare: boolean
}
type BrandRow = { fuelClass: FuelClass; brand: string; n: number; total: number; cls: number }
type YearRow = { fuelClass: FuelClass; year: number; n: number; total: number }

const pct = (part: number, whole: number): number => (whole > 0 ? (part / whole) * 100 : 0)

@Injectable()
export class PowertrainStatsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async get(): Promise<PowertrainStatsResponse> {
    const db = this.dbService.db
    const currentYear = new Date().getFullYear()
    const rareMin = sql.raw(String(RARE_MIN_CARS))

    const [summary, models, brands, years] = await Promise.all([
      db.execute<SummaryRow>(
        sql`SELECT fuel_class AS "fuelClass", sum(n)::float8 AS n, count(DISTINCT brand)::int AS brands,
                   count(DISTINCT (brand, model))::int AS models,
                   (sum(co2_g_km * n) FILTER (WHERE co2_g_km IS NOT NULL)
                     / NULLIF(sum(n) FILTER (WHERE co2_g_km IS NOT NULL), 0))::float8 AS "avgCo2"
            FROM registry.stats_fuel GROUP BY fuel_class`
      ),
      // Per-class model counts plus each model's all-fuel total (for "share of this model that is electric").
      db.execute<ModelRow>(
        sql`WITH m AS (
              SELECT fuel_class, brand, model, sum(n)::float8 AS n FROM registry.stats_fuel GROUP BY 1, 2, 3
            ), j AS (
              SELECT fuel_class, brand, model, n, sum(n) OVER (PARTITION BY brand, model) AS total,
                     sum(n) OVER (PARTITION BY fuel_class) AS cls,
                     row_number() OVER (PARTITION BY fuel_class ORDER BY n DESC, brand, model) AS top_rn,
                     row_number() OVER (PARTITION BY fuel_class, (n >= ${rareMin}) ORDER BY n, brand, model) AS low_rn,
                     n >= ${rareMin} AS rare_ok
              FROM m
            )
            SELECT fuel_class AS "fuelClass", brand, model, n::float8 AS n, total::float8 AS total, cls::float8 AS cls,
                   (top_rn <= ${TOP_MODELS}) AS "isTop", (rare_ok AND low_rn <= ${RARE_MODELS}) AS "isRare"
            FROM j WHERE top_rn <= ${TOP_MODELS} OR (rare_ok AND low_rn <= ${RARE_MODELS})
            ORDER BY fuel_class, n DESC, brand, model`
      ),
      db.execute<BrandRow>(
        sql`WITH b AS (
              SELECT fuel_class, brand, sum(n)::float8 AS n FROM registry.stats_fuel GROUP BY 1, 2
            ), j AS (
              SELECT fuel_class, brand, n, sum(n) OVER (PARTITION BY brand) AS total,
                     sum(n) OVER (PARTITION BY fuel_class) AS cls,
                     row_number() OVER (PARTITION BY fuel_class ORDER BY n DESC, brand) AS rn
              FROM b
            )
            SELECT fuel_class AS "fuelClass", brand, n::float8 AS n, total::float8 AS total, cls::float8 AS cls
            FROM j WHERE rn <= ${TOP_BRANDS} ORDER BY fuel_class, n DESC, brand`
      ),
      db.execute<YearRow>(
        sql`WITH y AS (
              SELECT fuel_class, make_year AS year, sum(n)::float8 AS n FROM registry.stats_fuel
              WHERE make_year BETWEEN ${FIRST_YEAR} AND ${currentYear} GROUP BY 1, 2
            )
            SELECT fuel_class AS "fuelClass", year, n, sum(n) OVER (PARTITION BY year)::float8 AS total FROM y
            ORDER BY fuel_class, year DESC`
      )
    ])

    const total = summary.rows.reduce((acc, r) => acc + r.n, 0)
    const classes = summary.rows
      .filter(r => FUEL_CLASSES.includes(r.fuelClass))
      .sort((a, b) => b.n - a.n)
      .map(s => {
        const toModel = (r: ModelRow): PowertrainModel => ({
          brand: r.brand,
          model: r.model,
          n: r.n,
          classShare: pct(r.n, r.cls),
          modelShare: pct(r.n, r.total)
        })
        const classModels = models.rows.filter(r => r.fuelClass === s.fuelClass)
        const topModels = classModels.filter(r => r.isTop).map(toModel)
        const topBrands: PowertrainBrand[] = brands.rows
          .filter(r => r.fuelClass === s.fuelClass)
          .map(r => ({ brand: r.brand, n: r.n, classShare: pct(r.n, r.cls), brandShare: pct(r.n, r.total) }))
        return {
          fuelClass: s.fuelClass,
          n: s.n,
          share: pct(s.n, total),
          brands: s.brands,
          models: s.models,
          avgCo2: s.avgCo2,
          topBrand: topBrands[0] ?? null,
          topModel: topModels[0] ?? null,
          topModels,
          topBrands,
          // The query orders by n DESC, so the rare slice is reversed into "rarest first".
          rareModels: classModels
            .filter(r => r.isRare)
            .map(toModel)
            .reverse(),
          byYear: years.rows
            .filter(r => r.fuelClass === s.fuelClass)
            .slice(0, YEARS_SHOWN)
            .map(r => ({ year: r.year, n: r.n, share: pct(r.n, r.total) }))
        }
      })

    return powertrainStatsResponseSchema.parse({ total, rareMinCars: RARE_MIN_CARS, classes })
  }
}
