import { Inject, Injectable } from '@nestjs/common'
import { brandOriginPeriod, brandOwnership, modelPlant, wmiPrefix } from '@carplates/db'
import { brandSlug, hasKnownWmi, isVin, lookupWmi, modelKey, vinRegion } from '@carplates/shared'
import type { BrandOriginPeriod, BrandOwnership, ModelPlant, OriginResponse } from '@carplates/shared'
import { and, asc, eq, max } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

import { buildHints, pickByYear } from './origin-hints.js'

export type OriginQuery = {
  brand: string
  model?: string
  year?: number
  vin?: string
  /** NHTSA "Plant Country" already mapped to ISO 3166-1 alpha-2 by the caller. */
  plantCountry?: string
  plantCity?: string
}

type WmiRow = { fromYear: number; toYear: number | null; maker: string | null; countryCode: string | null }

@Injectable()
export class OriginService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Brand and VIN-prefix facts only where known; nothing is guessed (ORIGIN_PLAN.md). */
  async lookup(query: OriginQuery): Promise<OriginResponse> {
    const slug = brandSlug(query.brand)
    const vin = query.vin?.trim().toUpperCase()
    // Pre-1981 / Soviet chassis numbers are not standardized: no VIN-derived facts for them.
    const validVin = vin && isVin(vin) ? vin : null
    const year = query.year ?? null

    const [periods, ownership, modelPlants, wmiRows] = await Promise.all([
      slug ? this.periods(slug) : [],
      slug ? this.ownership(slug) : [],
      slug && query.model ? this.modelPlants(slug, query.model) : [],
      validVin ? this.wmiRows(validVin.slice(0, 3)) : []
    ])

    const wmi = validVin ? resolveWmi(validVin, year, wmiRows) : null
    const plantCountry = query.plantCountry ?? wmi?.countryCode ?? null

    return {
      brand:
        slug && (periods.length || ownership.length) ? { slug, periods, ownership, asOf: await this.asOf(slug) } : null,
      plant: plantCountry
        ? { countryCode: plantCountry, city: query.plantCity ?? null, source: query.plantCountry ? 'nhtsa' : 'wmi' }
        : null,
      wmi,
      modelPlants,
      hints: buildHints({
        brandSlug: slug,
        year,
        period: pickByYear(periods, year),
        ownerNames: ownership.map(o => o.ownerName),
        wmiMaker: wmi?.maker,
        wmiRegion: wmi?.region,
        plantCountry
      })
    }
  }

  /** Latest ingest date of the brand rows. */
  private async asOf(slug: string): Promise<string | null> {
    const [row] = await this.dbService.db
      .select({ at: max(brandOriginPeriod.updatedAt) })
      .from(brandOriginPeriod)
      .where(eq(brandOriginPeriod.brandSlug, slug))
    return row?.at ? new Date(row.at).toISOString().slice(0, 10) : null
  }

  private async periods(slug: string): Promise<BrandOriginPeriod[]> {
    const rows = await this.dbService.db
      .select()
      .from(brandOriginPeriod)
      .where(eq(brandOriginPeriod.brandSlug, slug))
      .orderBy(asc(brandOriginPeriod.fromYear))
    return rows.map(r => ({
      countryCode: r.countryCode,
      fromYear: r.fromYear,
      toYear: r.toYear,
      foundedYear: r.foundedYear,
      hqCity: r.hqCity,
      source: r.source
    }))
  }

  private async ownership(slug: string): Promise<BrandOwnership[]> {
    const rows = await this.dbService.db
      .select()
      .from(brandOwnership)
      .where(eq(brandOwnership.brandSlug, slug))
      .orderBy(asc(brandOwnership.fromYear))
    return rows.map(r => ({
      ownerName: r.ownerName,
      ownerCountry: r.ownerCountry,
      fromYear: r.fromYear,
      toYear: r.toYear,
      source: r.source
    }))
  }

  /** `model_slug` is the alphanumeric `modelKey` of the registry model (ORIGIN_PLAN.md Step 3). */
  private async modelPlants(slug: string, model: string): Promise<ModelPlant[]> {
    const key = modelKey(model)
    if (!key) return []
    const rows = await this.dbService.db
      .select()
      .from(modelPlant)
      .where(and(eq(modelPlant.brandSlug, slug), eq(modelPlant.modelSlug, key)))
      .orderBy(asc(modelPlant.fromYear))
    return rows.map(r => ({
      countryCode: r.countryCode,
      city: r.city || null,
      fromYear: r.fromYear,
      toYear: r.toYear,
      sourceUrl: r.sourceUrl
    }))
  }

  private wmiRows(wmi: string): Promise<WmiRow[]> {
    return this.dbService.db.select().from(wmiPrefix).where(eq(wmiPrefix.wmi, wmi)).orderBy(asc(wmiPrefix.fromYear))
  }
}

/**
 * `registry.wmi_prefix` (vPIC) first. It lacks many non-US-market prefixes (TMB, JTD, XTA), so the curated
 * `lookupWmi` table and finally the first-character country block fill in.
 */
export function resolveWmi(
  vin: string,
  year: number | null,
  rows: readonly WmiRow[]
): NonNullable<OriginResponse['wmi']> {
  const wmi = vin.slice(0, 3)
  const region = vinRegion(vin)
  const row = pickByYear(rows, year)
  const fallback = lookupWmi(vin)
  // vPIC files a prefix under the manufacturer's address, so importers' European prefixes come back as "US" (U5Y = HATCI).
  // The curated table names the plant country by hand and wins for the country whenever it lists the exact prefix.
  if (row?.countryCode) {
    const countryCode = hasKnownWmi(vin) && fallback ? fallback.country : row.countryCode
    return { wmi, maker: row.maker, countryCode, region }
  }

  return { wmi, maker: row?.maker ?? fallback?.make ?? null, countryCode: fallback?.country ?? null, region }
}
