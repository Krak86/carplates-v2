import { Inject, Injectable } from '@nestjs/common'
import { vdbStatsResponseSchema } from '@carplates/shared'
import type { VdbStatsResponse, VdbVehicleClass } from '@carplates/shared'
import { sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

/** A model needs this many registered cars to appear in a list — keeps one-off imports out of the rankings. */
const MIN_CARS_MODEL = 1000
const LIST_SIZE = 10
/** Decile at or above which a model counts as "rare elsewhere" (bottom third of the markets that list it). */
const RARE_DECILE = 8
const DECILES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

type ModelRow = { make: string; model: string; decile: number | null; countries: string[]; n: number }

@Injectable()
export class VdbStatsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async get(kind: VdbVehicleClass = 'car'): Promise<VdbStatsResponse> {
    const db = this.dbService.db
    const ofKind = sql`vehicle_kind = ${kind}`
    const [overall, deciles, rare, uaOnly] = await Promise.all([
      db.execute<{ total: number; matched: number; ranked: number; uaOnly: number }>(
        sql`SELECT sum(n)::float8 AS total,
                   (COALESCE(sum(n) FILTER (WHERE vdb_id IS NOT NULL), 0))::float8 AS matched,
                   (COALESCE(sum(n) FILTER (WHERE global_decile IS NOT NULL), 0))::float8 AS ranked,
                   (COALESCE(sum(n) FILTER (WHERE ua_only), 0))::float8 AS "uaOnly"
            FROM registry.stats_vdb WHERE ${ofKind}`
      ),
      db.execute<{ decile: number; n: number }>(
        sql`SELECT global_decile::int AS decile, sum(n)::float8 AS n
            FROM registry.stats_vdb WHERE ${ofKind} AND global_decile IS NOT NULL GROUP BY 1`
      ),
      db.execute<ModelRow>(
        sql`SELECT make_name AS make, model_name AS model, global_decile::int AS decile, countries, n::float8 AS n
            FROM registry.stats_vdb
            WHERE ${ofKind} AND NOT ua_only AND global_decile >= ${RARE_DECILE} AND n >= ${MIN_CARS_MODEL}
            ORDER BY n DESC LIMIT ${LIST_SIZE}`
      ),
      db.execute<ModelRow>(
        sql`SELECT make_name AS make, model_name AS model, global_decile::int AS decile, countries, n::float8 AS n
            FROM registry.stats_vdb WHERE ${ofKind} AND ua_only AND n >= ${MIN_CARS_MODEL}
            ORDER BY n DESC LIMIT ${LIST_SIZE}`
      )
    ])

    const counts = new Map(deciles.rows.map(r => [r.decile, r.n]))
    const o = overall.rows[0]
    return vdbStatsResponseSchema.parse({
      total: o?.total ?? 0,
      matched: o?.matched ?? 0,
      ranked: o?.ranked ?? 0,
      uaOnly: o?.uaOnly ?? 0,
      byDecile: DECILES.map(decile => ({ decile, n: counts.get(decile) ?? 0 })),
      rareElsewhere: rare.rows,
      uaOnlyModels: uaOnly.rows
    })
  }
}
