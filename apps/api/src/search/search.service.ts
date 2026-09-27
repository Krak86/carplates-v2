import { Inject, Injectable } from '@nestjs/common'
import { currentRegistration, statsByBrand, statsByModel } from '@carplates/db'
import { fuelKeyword, platePrefixesForRegion, sourceValueForKind, sourceValuesForColor } from '@carplates/shared'
import type {
  BrandSuggestionsResponse,
  ModelSuggestionsResponse,
  SearchResponse,
  VehicleColor,
  VehicleFuel,
  VehicleKind
} from '@carplates/shared'
import { and, desc, eq, gte, ilike, inArray, isNotNull, lte, sql, type SQL } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

export type SearchFilters = {
  brand?: string
  model?: string
  yearFrom?: number
  yearTo?: number
  fuel?: VehicleFuel
  color?: VehicleColor
  kind?: VehicleKind
  region?: string
  page: number
  pageSize: number
}

/**
 * A broad filter (e.g. brand=kia alone, ~365k of the 16M+ rows) makes an exact COUNT(*) *and* an
 * `ORDER BY <non-indexed-by-the-filter column> LIMIT` both expensive — the latter isn't just slow
 * for a broad match either: the planner's row-count misestimate for a combined ILIKE AND ILIKE
 * (e.g. brand+model together) made it pick a multi-second plan for a comparatively *narrow*
 * match too, so this can't be fixed by feeding it a "better" ORDER BY/index hint — the shape of
 * the query itself is the problem. Instead: fetch up to this many matching rows with no ORDER BY
 * at all (letting Postgres use whatever bitmap/trigram plan it likes, consistently fast in
 * testing across every filter combination — the GIN indexes from migration 0013 exist for this),
 * then sort and paginate that already-small, already-fetched set in Node. `totalIsExact` tells
 * the caller whether the fetched count is the real total or just "at least this many".
 */
const SEARCH_COUNT_CAP = 10_000

@Injectable()
export class SearchService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Top-10 brands by distinctPlates matching `q` — a popular real spelling outranks the ~36k distinct ingest-noise variants. */
  async suggestBrands(q: string): Promise<BrandSuggestionsResponse> {
    const db = this.dbService.db
    const conditions: SQL[] = [isNotNull(statsByBrand.brand)]
    if (q) conditions.push(ilike(statsByBrand.brand, `%${q}%`))

    const rows = await db
      .select({ brand: statsByBrand.brand, distinctPlates: statsByBrand.distinctPlates })
      .from(statsByBrand)
      .where(and(...conditions))
      .orderBy(desc(statsByBrand.distinctPlates))
      .limit(10)

    return { suggestions: rows.filter((r): r is { brand: string; distinctPlates: number } => r.brand != null) }
  }

  /**
   * Top-10 models matching `q`, by distinctPlates. Scoped to one brand when given. Without a
   * brand, the same nameplate can appear under several real brands (or ingest-noise brand
   * spellings), so this aggregates across all of them and ranks by their combined weight —
   * an approximation (stats_by_model's per-brand distinctPlates aren't perfectly additive
   * across brands), acceptable for suggestion ordering, not shown as a real count anywhere.
   */
  async suggestModels(brand: string | undefined, q: string): Promise<ModelSuggestionsResponse> {
    const db = this.dbService.db

    if (brand) {
      const conditions: SQL[] = [eq(statsByModel.brand, brand)]
      if (q) conditions.push(ilike(statsByModel.model, `%${q}%`))

      const suggestions = await db
        .select({ model: statsByModel.model, distinctPlates: statsByModel.distinctPlates })
        .from(statsByModel)
        .where(and(...conditions))
        .orderBy(desc(statsByModel.distinctPlates))
        .limit(10)

      return { suggestions }
    }

    const totalDistinctPlates = sql<number>`sum(${statsByModel.distinctPlates})::int`
    const suggestions = await db
      .select({ model: statsByModel.model, distinctPlates: totalDistinctPlates })
      .from(statsByModel)
      .where(q ? ilike(statsByModel.model, `%${q}%`) : undefined)
      .groupBy(statsByModel.model)
      .orderBy(desc(totalDistinctPlates))
      .limit(10)

    return { suggestions }
  }

  async search(filters: SearchFilters): Promise<SearchResponse> {
    const db = this.dbService.db
    const conditions = [
      // Substring + case-insensitive, not an exact match on the suggestion's own spelling —
      // free text typed without picking a suggestion (any case, partial word) still matches.
      filters.brand ? ilike(currentRegistration.brand, `%${filters.brand}%`) : undefined,
      filters.model ? ilike(currentRegistration.model, `%${filters.model}%`) : undefined,
      filters.yearFrom != null ? gte(currentRegistration.makeYear, filters.yearFrom) : undefined,
      filters.yearTo != null ? lte(currentRegistration.makeYear, filters.yearTo) : undefined,
      filters.fuel ? ilike(currentRegistration.fuel, `%${fuelKeyword(filters.fuel)}%`) : undefined,
      filters.color ? inArray(currentRegistration.color, sourceValuesForColor(filters.color)) : undefined,
      filters.kind ? eq(currentRegistration.kind, sourceValueForKind(filters.kind)) : undefined,
      // Matches the ix_current_reg_plate_region expression index (packages/db migration 0015) --
      // same cost as any other single-column filter here, combined via BitmapAnd.
      filters.region
        ? inArray(sql`left(${currentRegistration.plate}, 2)`, platePrefixesForRegion(filters.region))
        : undefined
    ].filter((c): c is SQL => c != null)
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const matches = await db
      .select({
        plate: currentRegistration.plate,
        vin: currentRegistration.vin,
        brand: currentRegistration.brand,
        model: currentRegistration.model,
        makeYear: currentRegistration.makeYear,
        color: currentRegistration.color,
        fuel: currentRegistration.fuel,
        dReg: currentRegistration.dReg
      })
      .from(currentRegistration)
      .where(where)
      .limit(SEARCH_COUNT_CAP)

    matches.sort((a, b) => a.plate.localeCompare(b.plate))

    const offset = (filters.page - 1) * filters.pageSize
    const total = matches.length
    return {
      results: matches.slice(offset, offset + filters.pageSize),
      total,
      totalIsExact: total < SEARCH_COUNT_CAP,
      page: filters.page,
      pageSize: filters.pageSize
    }
  }
}
