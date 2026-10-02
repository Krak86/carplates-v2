import { Inject, Injectable } from '@nestjs/common'
import { CRASH_SOURCES, safetyStatsResponseSchema } from '@carplates/shared'
import type { CrashSource, SafetyStatsResponse } from '@carplates/shared'
import { sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

/** A brand/model needs this many rated cars to appear in a leaderboard — keeps one-off imports out of the rankings. */
const MIN_CARS_BRAND = 2000
const MIN_CARS_MODEL = 1500
const LEADERBOARD_SIZE = 15
const BAND_WIDTH = 10

type RowShape = { label: string; n: number; matched: number; avgScore: number | null }
type ModelShape = { brand: string; model: string; n: number; avgScore: number; sources: number }

/** Weighted mean over rated cars only, so unrated groups never drag an average toward zero. */
const AVG = sql`(sum(score * n) FILTER (WHERE score IS NOT NULL) / NULLIF(sum(n) FILTER (WHERE score IS NOT NULL), 0))::float8`
const COUNTS = sql`sum(n)::float8 AS n, (COALESCE(sum(n) FILTER (WHERE score IS NOT NULL), 0))::float8 AS matched`

/** Column of `registry.stats_safety` holding each source's own score. */
const SOURCE_COLUMN: Readonly<Record<CrashSource, string>> = {
  euroncap: 'euroncap_score',
  jncap: 'jncap_score',
  cncap: 'cncap_score',
  kncap: 'kncap_score',
  iihs: 'iihs_score'
}

@Injectable()
export class SafetyStatsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async get(): Promise<SafetyStatsResponse> {
    const db = this.dbService.db
    const [overall, byYear, byBrand, bySource, safest, leastSafe, distribution] = await Promise.all([
      db.execute<{ n: number; matched: number; avg: number | null }>(
        sql`SELECT ${COUNTS}, ${AVG} AS avg FROM registry.stats_safety`
      ),
      db.execute<RowShape>(
        sql`SELECT make_year::text AS label, ${COUNTS}, ${AVG} AS "avgScore" FROM registry.stats_safety GROUP BY make_year ORDER BY make_year`
      ),
      db.execute<RowShape>(
        sql`SELECT brand AS label, ${COUNTS}, ${AVG} AS "avgScore" FROM registry.stats_safety GROUP BY brand
            HAVING sum(n) FILTER (WHERE score IS NOT NULL) >= ${MIN_CARS_BRAND} ORDER BY 4 DESC LIMIT 60`
      ),
      Promise.all(CRASH_SOURCES.map(source => this.sourceRow(source))),
      this.modelLeaderboard('DESC'),
      this.modelLeaderboard('ASC'),
      db.execute<{ from: number; n: number }>(
        sql`SELECT (least(floor(score / ${BAND_WIDTH}), 9) * ${BAND_WIDTH})::int AS "from", sum(n)::float8 AS n
            FROM registry.stats_safety WHERE score IS NOT NULL GROUP BY 1 ORDER BY 1`
      )
    ])

    const o = overall.rows[0]
    return safetyStatsResponseSchema.parse({
      total: o?.n ?? 0,
      matched: o?.matched ?? 0,
      fleetAvgScore: o?.avg ?? null,
      byYear: byYear.rows,
      byBrand: byBrand.rows,
      bySource,
      safestModels: safest,
      leastSafeModels: leastSafe,
      distribution: distribution.rows,
      bandWidth: BAND_WIDTH
    })
  }

  private async sourceRow(
    source: CrashSource
  ): Promise<{ source: CrashSource; matched: number; avgScore: number | null }> {
    const col = sql.raw(SOURCE_COLUMN[source])
    const { rows } = await this.dbService.db.execute<{ matched: number; avgScore: number | null }>(
      sql`SELECT COALESCE(sum(n), 0)::float8 AS matched, (sum(${col} * n) / NULLIF(sum(n), 0))::float8 AS "avgScore"
          FROM registry.stats_safety WHERE ${col} IS NOT NULL`
    )
    return { source, matched: rows[0]?.matched ?? 0, avgScore: rows[0]?.avgScore ?? null }
  }

  /** Ties (many models share a perfect 100) go to the better-evidenced model: more sources, then more cars. */
  private async modelLeaderboard(direction: 'ASC' | 'DESC'): Promise<ModelShape[]> {
    const order = direction === 'ASC' ? sql`ASC` : sql`DESC`
    const { rows } = await this.dbService.db.execute<ModelShape>(
      sql`SELECT brand, model, sum(n)::float8 AS n,
                 (sum(score * n) / sum(n))::float8 AS "avgScore", max(sources)::int AS sources
          FROM registry.stats_safety WHERE score IS NOT NULL
          GROUP BY brand, model HAVING sum(n) >= ${MIN_CARS_MODEL}
          ORDER BY 4 ${order}, 5 DESC, 3 DESC LIMIT ${LEADERBOARD_SIZE}`
    )
    return rows
  }
}
