import { Inject, Injectable } from '@nestjs/common'
import { currentRegistration, statsByBody, statsByBrand, statsByModel, statsByOper } from '@carplates/db'
import {
  fuelKeyword,
  mergeBodyStats,
  normalizeBody,
  platePrefixesForRegion,
  regionName,
  sourceValueForKind,
  sourceValueForPurpose,
  sourceValuesForColor
} from '@carplates/shared'
import type {
  BodySuggestionsResponse,
  BrandSuggestionsResponse,
  ModelSuggestionsResponse,
  OperSuggestionsResponse,
  SearchResponse,
  SearchSortDir,
  SearchSortKey,
  VehicleColor,
  VehicleFuel,
  VehicleKind,
  VehiclePurpose
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
  purpose?: VehiclePurpose
  body?: string
  region?: string
  /** Latest operation code (current status), e.g. 215 = temporary state registration for a serviceman. */
  oper?: number
  sort: SearchSortKey
  dir: SearchSortDir
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

/**
 * Repeated queries (the next page, a re-sort, a shared link) reuse the fetched match set instead of re-running the
 * 10k-row scan: the registry only changes on ingest, so a few minutes of staleness is invisible. Bounded, in-process
 * (one API instance per colour; the other colour just warms its own copy).
 */
const MATCH_CACHE_TTL_MS = 5 * 60_000
const MATCH_CACHE_MAX = 16

/** Above this many matching brand/model spellings the `= ANY` route stops paying off; the substring scan is used instead. */
const MAX_SPELLINGS = 1000

const collator = new Intl.Collator()

type SortableRow = {
  plate: string
  brand: string | null
  model: string | null
  makeYear: number | null
  color: string | null
  fuel: string | null
  kind: string | null
  body: string | null
  operName: string | null
}

type MatchRow = Awaited<ReturnType<SearchService['fetchMatches']>>[number]

type MatchEntry = {
  at: number
  rows: Promise<MatchRow[]>
  /** Sorted copies of the rows by "sort:dir"; the rows themselves are shared, so each costs one pointer array. */
  sorted: Map<string, MatchRow[]>
}

function sortValue(row: SortableRow, key: SearchSortKey): string | number | null {
  if (key === 'region') return regionName(row.plate) ?? null
  if (key === 'oper') return row.operName
  return row[key]
}

@Injectable()
export class SearchService {
  private readonly matchCache = new Map<string, MatchEntry>()

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

  /** Top-10 body values by distinctPlates matching `q`, "-B" and plain spellings merged ("МІКРОАВТОБУС МЕДДОПОМОГА", "СЕДАН"...). */
  async suggestBodies(q: string): Promise<BodySuggestionsResponse> {
    const rows = await this.dbService.db
      .select({ body: statsByBody.body, distinctPlates: statsByBody.distinctPlates })
      .from(statsByBody)
      .where(and(isNotNull(statsByBody.body), q ? ilike(statsByBody.body, `%${normalizeBody(q)}%`) : undefined))
      .orderBy(desc(statsByBody.distinctPlates))
      .limit(20)

    const merged = mergeBodyStats(rows.map(r => ({ ...r, totalRows: 0, distinctVins: 0 })))
    return {
      suggestions: merged
        .filter((r): r is typeof r & { body: string } => r.body != null)
        .slice(0, 10)
        .map(r => ({ body: r.body, distinctPlates: r.distinctPlates }))
    }
  }

  /** Every operation code with its most common name and current vehicle count (~190 rows from the stats_by_oper rollup). */
  async suggestOperations(): Promise<OperSuggestionsResponse> {
    const rows = await this.dbService.db
      .select({ code: statsByOper.operCode, name: statsByOper.operName, distinctPlates: statsByOper.distinctPlates })
      .from(statsByOper)
      .orderBy(desc(statsByOper.distinctPlates))

    return { operations: rows }
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

  /**
   * Brand + model are the common search and the slow one: two substring ILIKEs on a 2-3 character model such as "A6" read
   * 1.5M trigram hits (~2 s on 16M rows). The same match set is resolved from the small stats_by_* rollups (every distinct
   * spelling, ~75 ms) and then served by the (brand, model) btree (ix_current_reg_brand_model). Same rows, ~25x faster.
   */
  private async nameConditions({ brand, model }: SearchFilters): Promise<SQL[]> {
    const substring = [
      // Substring + case-insensitive, not an exact match on the suggestion's own spelling —
      // free text typed without picking a suggestion (any case, partial word) still matches.
      brand ? ilike(currentRegistration.brand, `%${brand}%`) : undefined,
      model ? ilike(currentRegistration.model, `%${model}%`) : undefined
    ].filter((c): c is SQL => c != null)
    if (!brand || !model) return substring

    const db = this.dbService.db
    const [brands, models] = await Promise.all([
      db
        .select({ value: statsByBrand.brand })
        .from(statsByBrand)
        .where(ilike(statsByBrand.brand, `%${brand}%`))
        .limit(MAX_SPELLINGS + 1),
      db
        .select({ value: statsByModel.model })
        .from(statsByModel)
        .where(ilike(statsByModel.model, `%${model}%`))
        .limit(MAX_SPELLINGS + 1)
    ])
    if (brands.length > MAX_SPELLINGS || models.length > MAX_SPELLINGS) return substring
    // stats_by_model is per brand, so the same spelling repeats.
    const brandValues = [...new Set(brands.map(r => r.value).filter((v): v is string => v != null))]
    const modelValues = [...new Set(models.map(r => r.value).filter((v): v is string => v != null))]
    if (brandValues.length === 0 || modelValues.length === 0) return [sql`false`]
    return [inArray(currentRegistration.brand, brandValues), inArray(currentRegistration.model, modelValues)]
  }

  private async fetchMatches(filters: SearchFilters, otherConditions: SQL[]) {
    const conditions = [...(await this.nameConditions(filters)), ...otherConditions]
    const where = conditions.length > 0 ? and(...conditions) : undefined
    return this.dbService.db
      .select({
        plate: currentRegistration.plate,
        vin: currentRegistration.vin,
        brand: currentRegistration.brand,
        model: currentRegistration.model,
        makeYear: currentRegistration.makeYear,
        color: currentRegistration.color,
        fuel: currentRegistration.fuel,
        dReg: currentRegistration.dReg,
        kind: currentRegistration.kind,
        body: currentRegistration.body,
        operName: currentRegistration.operName,
        operCode: currentRegistration.operCode
      })
      .from(currentRegistration)
      .where(where)
      .limit(SEARCH_COUNT_CAP)
  }

  /** The match set for these filters (sort and page excluded), shared by concurrent and repeated requests. */
  private cachedMatches(filters: SearchFilters, otherConditions: SQL[]): MatchEntry {
    const { sort: _s, dir: _d, page: _p, pageSize: _ps, ...key } = filters
    const cacheKey = JSON.stringify(key, Object.keys(key).sort())
    const now = Date.now()

    const hit = this.matchCache.get(cacheKey)
    if (hit && now - hit.at < MATCH_CACHE_TTL_MS) {
      this.matchCache.delete(cacheKey) // re-insert: Map order = least recently used first
      this.matchCache.set(cacheKey, hit)
      return hit
    }

    // fetchMatches is async, so its result is a real promise: a bare Drizzle query is a lazy thenable that re-runs on every await.
    const entry: MatchEntry = { at: now, rows: this.fetchMatches(filters, otherConditions), sorted: new Map() }
    // A failed query must not be served again for the next 5 minutes.
    entry.rows.catch(() => {
      if (this.matchCache.get(cacheKey) === entry) this.matchCache.delete(cacheKey)
    })
    this.matchCache.delete(cacheKey)
    this.matchCache.set(cacheKey, entry)
    while (this.matchCache.size > MATCH_CACHE_MAX) {
      const oldest = this.matchCache.keys().next().value
      if (oldest === undefined) break
      this.matchCache.delete(oldest)
    }
    return entry
  }

  /** Nulls last in both directions; plate is the tiebreaker so paging stays stable. */
  private sortedMatches(entry: MatchEntry, rows: MatchRow[], filters: SearchFilters): MatchRow[] {
    const sortKey = `${filters.sort}:${filters.dir}`
    const cached = entry.sorted.get(sortKey)
    if (cached) return cached

    const sign = filters.dir === 'desc' ? -1 : 1
    const sorted = [...rows].sort((a, b) => {
      const av = sortValue(a, filters.sort)
      const bv = sortValue(b, filters.sort)
      if (av == null && bv != null) return 1
      if (av != null && bv == null) return -1
      if (av != null && bv != null && av !== bv) {
        const cmp =
          typeof av === 'number' && typeof bv === 'number' ? av - bv : collator.compare(String(av), String(bv))
        if (cmp !== 0) return cmp * sign
      }
      return collator.compare(a.plate, b.plate)
    })
    entry.sorted.set(sortKey, sorted)
    return sorted
  }

  async search(filters: SearchFilters): Promise<SearchResponse> {
    const conditions = [
      filters.yearFrom != null ? gte(currentRegistration.makeYear, filters.yearFrom) : undefined,
      filters.yearTo != null ? lte(currentRegistration.makeYear, filters.yearTo) : undefined,
      filters.fuel ? ilike(currentRegistration.fuel, `%${fuelKeyword(filters.fuel)}%`) : undefined,
      filters.color ? inArray(currentRegistration.color, sourceValuesForColor(filters.color)) : undefined,
      filters.kind ? eq(currentRegistration.kind, sourceValueForKind(filters.kind)) : undefined,
      // 3 exact values, unindexed: cheap alone (the 10k cap stops the scan early for "general"), best combined with another filter.
      filters.purpose ? eq(currentRegistration.purpose, sourceValueForPurpose(filters.purpose)) : undefined,
      // Substring, served by ix_current_reg_body_trgm (migration 0042).
      filters.body ? ilike(currentRegistration.body, `%${normalizeBody(filters.body)}%`) : undefined,
      // Exact code, served by ix_current_reg_oper_code (migration 0059).
      filters.oper != null ? eq(currentRegistration.operCode, filters.oper) : undefined,
      // Matches the ix_current_reg_plate_region expression index (packages/db migration 0015) --
      // same cost as any other single-column filter here, combined via BitmapAnd.
      filters.region
        ? inArray(sql`left(${currentRegistration.plate}, 2)`, platePrefixesForRegion(filters.region))
        : undefined
    ].filter((c): c is SQL => c != null)
    const entry = this.cachedMatches(filters, conditions)
    const matches = await entry.rows
    const sorted = this.sortedMatches(entry, matches, filters)

    const offset = (filters.page - 1) * filters.pageSize
    const total = sorted.length
    return {
      results: sorted.slice(offset, offset + filters.pageSize),
      total,
      totalIsExact: total < SEARCH_COUNT_CAP,
      page: filters.page,
      pageSize: filters.pageSize
    }
  }
}
