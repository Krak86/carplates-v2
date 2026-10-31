import { Inject, Injectable } from '@nestjs/common'
import {
  dtpCauseYear,
  dtpHazardSection,
  dtpRegionYear,
  dtpRoadYear,
  dtpTimeYear,
  dtpTypeYear,
  statsRegionFacet
} from '@carplates/db'
import {
  roadSafetyCausesResponseSchema,
  roadSafetyHazardsResponseSchema,
  roadSafetyRegionsResponseSchema,
  roadSafetyRoadsResponseSchema,
  roadSafetyTimeResponseSchema
} from '@carplates/shared'
import type {
  RoadSafetyCausesResponse,
  RoadSafetyHazardsQuery,
  RoadSafetyHazardsResponse,
  RoadSafetyRegionsResponse,
  RoadSafetyRoadsQuery,
  RoadSafetyRoadsResponse,
  RoadSafetyTimeResponse,
  RoadSafetyYear,
  RoadSafetyYearQuery
} from '@carplates/shared'
import { and, asc, desc, eq, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

import { buildRegions, listYears, pickYear } from './helpers.js'

/** Road-safety statistics: Patrol Police yearly aggregates (`dtp_*_year`) and the hazardous-section CSVs (`dtp_hazard_section`). */
@Injectable()
export class RoadSafetyService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** The loaded Patrol Police files (year + period), for every endpoint's `?year=` resolution. */
  private async files(): Promise<{ year: number; period: number }[]> {
    return this.dbService.db
      .selectDistinct({ year: dtpRegionYear.year, period: dtpRegionYear.period })
      .from(dtpRegionYear)
  }

  /** Null when the data is not loaded or the asked year does not exist: the controller answers 404. */
  private async resolve(query: RoadSafetyYearQuery): Promise<RoadSafetyYear | null> {
    return pickYear(await this.files(), query.year)
  }

  async regions(query: RoadSafetyYearQuery): Promise<RoadSafetyRegionsResponse | null> {
    const files = await this.files()
    const picked = pickYear(files, query.year)
    if (!picked) return null
    const { db } = this.dbService

    const [rows, fleetRows] = await Promise.all([
      db
        .select()
        .from(dtpRegionYear)
        .where(and(eq(dtpRegionYear.year, picked.year), eq(dtpRegionYear.period, picked.period))),
      db
        .select({ region: statsRegionFacet.region, n: statsRegionFacet.n })
        .from(statsRegionFacet)
        .where(eq(statsRegionFacet.facet, 'fleet'))
    ])
    const regions = buildRegions(rows, new Map(fleetRows.map(f => [f.region, f.n])))
    const national = regions.reduce(
      (t, r) => ({ crashes: t.crashes + r.crashes, deaths: t.deaths + r.deaths, injured: t.injured + r.injured }),
      { crashes: 0, deaths: 0, injured: 0 }
    )
    return roadSafetyRegionsResponseSchema.parse({
      year: picked.year,
      period: picked.period,
      years: listYears(files),
      national,
      regions
    })
  }

  async roads(query: RoadSafetyRoadsQuery): Promise<RoadSafetyRoadsResponse | null> {
    const picked = await this.resolve(query)
    if (!picked) return null
    const roads = await this.dbService.db
      .select({
        roadCode: dtpRoadYear.roadCode,
        roadName: dtpRoadYear.roadName,
        crashes: dtpRoadYear.crashes,
        deaths: dtpRoadYear.deaths,
        injured: dtpRoadYear.injured
      })
      .from(dtpRoadYear)
      .where(and(eq(dtpRoadYear.year, picked.year), eq(dtpRoadYear.period, picked.period)))
      .orderBy(desc(dtpRoadYear.deaths), desc(dtpRoadYear.crashes), asc(dtpRoadYear.roadCode))
      .limit(query.limit)
    return roadSafetyRoadsResponseSchema.parse({ year: picked.year, period: picked.period, roads })
  }

  async causes(query: RoadSafetyYearQuery): Promise<RoadSafetyCausesResponse | null> {
    const picked = await this.resolve(query)
    if (!picked) return null
    const { db } = this.dbService
    const [causes, types] = await Promise.all([
      db
        .select({
          name: dtpCauseYear.cause,
          crashes: dtpCauseYear.crashes,
          deaths: dtpCauseYear.deaths,
          injured: dtpCauseYear.injured
        })
        .from(dtpCauseYear)
        .where(and(eq(dtpCauseYear.year, picked.year), eq(dtpCauseYear.period, picked.period)))
        .orderBy(desc(dtpCauseYear.deaths), desc(dtpCauseYear.crashes)),
      db
        .select({
          name: dtpTypeYear.type,
          crashes: dtpTypeYear.crashes,
          deaths: dtpTypeYear.deaths,
          injured: dtpTypeYear.injured
        })
        .from(dtpTypeYear)
        .where(and(eq(dtpTypeYear.year, picked.year), eq(dtpTypeYear.period, picked.period)))
        .orderBy(desc(dtpTypeYear.deaths), desc(dtpTypeYear.crashes))
    ])
    return roadSafetyCausesResponseSchema.parse({ year: picked.year, period: picked.period, causes, types })
  }

  async time(query: RoadSafetyYearQuery): Promise<RoadSafetyTimeResponse | null> {
    const picked = await this.resolve(query)
    if (!picked) return null
    const rows = await this.dbService.db
      .select({ dim: dtpTimeYear.dim, bucket: dtpTimeYear.bucket, crashes: dtpTimeYear.crashes })
      .from(dtpTimeYear)
      .where(and(eq(dtpTimeYear.year, picked.year), eq(dtpTimeYear.period, picked.period)))
      .orderBy(asc(dtpTimeYear.bucket))
    const by = (dim: string): { bucket: number; crashes: number }[] =>
      rows.filter(r => r.dim === dim).map(({ bucket, crashes }) => ({ bucket, crashes }))
    return roadSafetyTimeResponseSchema.parse({
      year: picked.year,
      period: picked.period,
      weekdays: by('weekday'),
      hours: by('hour'),
      months: by('month')
    })
  }

  /** Hazard years are their own list (the yearly CSVs); no year = the latest. Null when nothing is loaded for the year. */
  async hazards(query: RoadSafetyHazardsQuery): Promise<RoadSafetyHazardsResponse | null> {
    const { db } = this.dbService
    const years = (await db.selectDistinct({ year: dtpHazardSection.year }).from(dtpHazardSection))
      .map(r => r.year)
      .sort((a, b) => b - a)
    const year = query.year ?? years[0]
    if (year === undefined || !years.includes(year)) return null

    const rows = await db
      .select()
      .from(dtpHazardSection)
      .where(
        and(
          eq(dtpHazardSection.year, year),
          query.region ? eq(dtpHazardSection.region, query.region) : undefined,
          query.kind ? eq(dtpHazardSection.kind, query.kind) : undefined
        )
      )
      .orderBy(
        asc(dtpHazardSection.kind),
        sql`${dtpHazardSection.crashes3y} desc nulls last`,
        asc(dtpHazardSection.seq)
      )
    return roadSafetyHazardsResponseSchema.parse({
      year,
      years,
      hazards: rows.map(r => ({
        kind: r.kind,
        region: r.region,
        roadCode: r.roadCode,
        roadName: r.roadName,
        kmStart: r.kmStart,
        kmEnd: r.kmEnd,
        lat: r.latStart,
        lon: r.lonStart,
        crashes3y: r.crashes3y,
        rate: r.rate === null ? null : Number(r.rate),
        hazardLevel: r.hazardLevel
      }))
    })
  }
}
