import { Inject, Injectable } from '@nestjs/common'
import type { WantedStatsResponse, WantedStatsRow, WantedStatsVehicle } from '@carplates/shared'
import { sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

const TOP = 100
const RECENT = 50
const CACHE_MS = 10 * 60 * 1000

type SummaryRow = {
  wantedNow: number
  foundTotal: number
  foundSinceTracking: number
  withPlate: number
  withVin: number
  medianDays: number | null
  historySince: string | null
  lastSeen: Date | string | null
}
type DimRow = { label: string; stolen: number; found: number; wanted: number }
type VehicleRow = {
  brand: string | null
  model: string | null
  vehicleType: string | null
  color: string | null
  plate: string | null
  seizedAt: string | null
  resolvedAt: Date | string | null
  region: string | null
}

/** Whitelisted SQL expressions for the grouped breakdowns (never user input). */
const DIMENSIONS = {
  byRegion: 'region',
  byBrand: 'brand',
  byModel: "brand || ' ' || model",
  byType: 'vehicle_type',
  byColor: 'color'
} as const

const toRow = (r: DimRow): WantedStatsRow => ({
  label: r.label,
  stolen: Number(r.stolen),
  found: Number(r.found),
  wanted: Number(r.wanted)
})

const toVehicle = (r: VehicleRow): WantedStatsVehicle => ({
  brand: r.brand,
  model: r.model,
  vehicleType: r.vehicleType,
  color: r.color,
  plate: r.plate,
  seizedAt: r.seizedAt ? String(r.seizedAt).slice(0, 10) : null,
  resolvedAt: r.resolvedAt ? new Date(r.resolvedAt).toISOString() : null,
  region: r.region
})

@Injectable()
export class WantedStatsService {
  private cache: { at: number; lastSeen: string | null; value: WantedStatsResponse } | null = null

  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async stats(): Promise<WantedStatsResponse> {
    const { db } = this.dbService
    const now = Date.now()

    // Cheap freshness probe: the cache is valid for 10 minutes and as long as the feed was not refreshed.
    if (this.cache && now - this.cache.at < CACHE_MS) {
      const {
        rows: [probe]
      } = await db.execute<{ lastSeen: Date | string | null }>(
        sql`SELECT max(last_seen_at) AS "lastSeen" FROM registry.wanted_vehicles`
      )
      const lastSeen = probe?.lastSeen ? new Date(probe.lastSeen).toISOString() : null
      if (lastSeen === this.cache.lastSeen) return this.cache.value
    }

    const dim = (expr: string) =>
      db.execute<DimRow>(
        sql`SELECT ${sql.raw(expr)} AS label, count(*)::int AS stolen,
                   (count(*) FILTER (WHERE resolved_at IS NOT NULL))::int AS found,
                   (count(*) FILTER (WHERE resolved_at IS NULL))::int AS wanted
            FROM registry.wanted_vehicles
            WHERE ${sql.raw(expr)} IS NOT NULL
            GROUP BY 1 ORDER BY stolen DESC, label LIMIT ${TOP}`
      )

    const [summaryRows, years, region, brand, model, type, color, recentStolen, recentFound] = await Promise.all([
      db.execute<SummaryRow>(
        sql`SELECT (count(*) FILTER (WHERE resolved_at IS NULL))::int AS "wantedNow",
                   (count(*) FILTER (WHERE resolved_at IS NOT NULL))::int AS "foundTotal",
                   (count(*) FILTER (WHERE resolved_at IS NOT NULL AND source = 'feed'))::int AS "foundSinceTracking",
                   (count(*) FILTER (WHERE plate IS NOT NULL))::int AS "withPlate",
                   (count(*) FILTER (WHERE vin IS NOT NULL))::int AS "withVin",
                   (percentile_cont(0.5) WITHIN GROUP (ORDER BY (resolved_at::date - seized_at))
                     FILTER (WHERE resolved_at IS NOT NULL AND resolved_exact AND seized_at IS NOT NULL
                             AND resolved_at::date >= seized_at))::float8 AS "medianDays",
                   (min(seized_at) FILTER (WHERE source = 'stolen.in.ua' AND seized_at >= '2020-08-01'))::text AS "historySince",
                   max(last_seen_at) AS "lastSeen"
            FROM registry.wanted_vehicles`
      ),
      db.execute<DimRow>(
        sql`SELECT extract(year FROM seized_at)::int::text AS label, count(*)::int AS stolen,
                   (count(*) FILTER (WHERE resolved_at IS NOT NULL))::int AS found,
                   (count(*) FILTER (WHERE resolved_at IS NULL))::int AS wanted
            FROM registry.wanted_vehicles WHERE seized_at IS NOT NULL
            GROUP BY 1 ORDER BY 1`
      ),
      dim(DIMENSIONS.byRegion),
      dim(DIMENSIONS.byBrand),
      dim(DIMENSIONS.byModel),
      dim(DIMENSIONS.byType),
      dim(DIMENSIONS.byColor),
      db.execute<VehicleRow>(
        sql`SELECT brand, model, vehicle_type AS "vehicleType", color, plate, seized_at::text AS "seizedAt",
                   resolved_at AS "resolvedAt", region
            FROM registry.wanted_vehicles WHERE seized_at IS NOT NULL
            ORDER BY seized_at DESC, source_id LIMIT ${RECENT}`
      ),
      // Exact removals only: a month-card placeholder carries the scrape time, not a real date.
      db.execute<VehicleRow>(
        sql`SELECT brand, model, vehicle_type AS "vehicleType", color, plate, seized_at::text AS "seizedAt",
                   resolved_at AS "resolvedAt", region
            FROM registry.wanted_vehicles WHERE resolved_at IS NOT NULL AND resolved_exact
            ORDER BY resolved_at DESC, source_id LIMIT ${RECENT}`
      )
    ])

    const s = summaryRows.rows[0]
    const lastSeen = s?.lastSeen ? new Date(s.lastSeen).toISOString() : null
    const value: WantedStatsResponse = {
      summary: {
        wantedNow: Number(s?.wantedNow ?? 0),
        foundTotal: Number(s?.foundTotal ?? 0),
        foundSinceTracking: Number(s?.foundSinceTracking ?? 0),
        withPlate: Number(s?.withPlate ?? 0),
        withVin: Number(s?.withVin ?? 0),
        medianDaysToFound: s?.medianDays == null ? null : Math.round(Number(s.medianDays)),
        historySince: s?.historySince ?? null
      },
      byYear: years.rows.map(toRow),
      byRegion: region.rows.map(toRow),
      byBrand: brand.rows.map(toRow),
      byModel: model.rows.map(toRow),
      byType: type.rows.map(toRow),
      byColor: color.rows.map(toRow),
      recentStolen: recentStolen.rows.map(toVehicle),
      recentFound: recentFound.rows.map(toVehicle),
      checkedAt: lastSeen
    }
    this.cache = { at: now, lastSeen, value }
    return value
  }
}
