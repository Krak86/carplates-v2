import { Inject, Injectable, Logger } from '@nestjs/common'
import { catalogAlias, catalogMake, catalogModel, catalogYearStats } from '@carplates/db'
import { CATALOG_TOP_MODELS, brandSlug, catalogStatsSchema, catalogYearStatsSchema, modelKey } from '@carplates/shared'
import type {
  CatalogLookup,
  CatalogMake,
  CatalogMakeSummary,
  CatalogModel,
  CatalogSibling,
  CatalogYearStats
} from '@carplates/shared'
import { and, eq } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

/** The taxonomy is a few thousand rows; re-read it this often so a monthly `db:refresh-catalog` shows up without a restart. */
const RELOAD_MS = 60 * 60 * 1000
const SIBLINGS = 12

type Snapshot = {
  at: number
  models: Map<string, CatalogModel>
  /** Indexable `[make, model]` pairs, biggest model first. */
  indexable: [string, string][]
  /** Raw registry (brand, model) spelling -> the page it folds into (only pairs whose page exists). */
  aliases: Map<string, [string, string]>
  /** Every make, biggest first. */
  makes: CatalogMakeSummary[]
  makeDetails: Map<string, CatalogMake>
}

const aliasKey = (brand: string, model: string): string => `${brand.trim().toLowerCase()}|${model.trim().toLowerCase()}`

/**
 * Model catalog read model: `catalog_model` rows kept in process memory (no per-request query, no Redis hop), reloaded
 * hourly. Crawlers hit these pages for weeks; the edge cache absorbs most of them, memory answers the rest.
 */
@Injectable()
export class CatalogService {
  private readonly log = new Logger(CatalogService.name)
  private snapshot: Snapshot | null = null
  private loading: Promise<Snapshot> | null = null

  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async get(make: string, model: string): Promise<CatalogModel | null> {
    return (await this.load()).models.get(`${make}/${model}`) ?? null
  }

  /**
   * The per-year breakdown of a model (generation stats), read on demand: ~10 KB a model, too much to keep for every page in
   * memory. An empty one when the model has a page but the build predates `catalog_year_stats`; null when it has no page.
   */
  async byYear(make: string, model: string): Promise<CatalogYearStats | null> {
    if (!(await this.load()).models.has(`${make}/${model}`)) return null
    const [row] = await this.dbService.db
      .select({ byYear: catalogYearStats.byYear })
      .from(catalogYearStats)
      .where(and(eq(catalogYearStats.makeSlug, make), eq(catalogYearStats.modelSlug, model)))
    const parsed = catalogYearStatsSchema.safeParse({ byYear: row?.byYear })
    return parsed.success ? parsed.data : { byYear: {} }
  }

  /**
   * The page a brand + model spelling belongs to: the registry alias first (plate cards send the raw registry values),
   * else the plain slugs (a VIN decode says `BMW` / `X5`). Null when no page exists, so the web links only to real pages.
   */
  async lookup(brand: string, model: string): Promise<CatalogLookup> {
    const { aliases, models } = await this.load()
    const hit = aliases.get(aliasKey(brand, model))
    if (hit) return { page: { make: hit[0], model: hit[1] } }
    const make = brandSlug(brand)
    const slug = modelKey(model)
    return make && slug && models.has(`${make}/${slug}`) ? { page: { make, model: slug } } : { page: null }
  }

  /** The `/cars` index. */
  async makes(): Promise<CatalogMakeSummary[]> {
    return (await this.load()).makes
  }

  /** One make with all its model pages (`/cars/:make`), or null. */
  async make(slug: string): Promise<CatalogMake | null> {
    return (await this.load()).makeDetails.get(slug) ?? null
  }

  /** Indexable catalog pages for the sitemap, biggest first. */
  async indexable(): Promise<[string, string][]> {
    return (await this.load()).indexable
  }

  /** Makes with at least one indexable model, for the sitemap. */
  async indexableMakes(): Promise<string[]> {
    return (await this.load()).makes.filter(m => m.indexable).map(m => m.make)
  }

  private async load(): Promise<Snapshot> {
    if (this.snapshot && Date.now() - this.snapshot.at < RELOAD_MS) return this.snapshot
    this.loading ??= this.read()
      .then(s => (this.snapshot = s))
      .catch((err: unknown) => {
        // A failed reload keeps serving the previous snapshot; a cold start with no snapshot has nothing to serve.
        this.log.error(`catalog reload failed: ${String(err)}`)
        if (this.snapshot) return this.snapshot
        throw err
      })
      .finally(() => {
        this.loading = null
      })
    return this.loading
  }

  private async read(): Promise<Snapshot> {
    const rows = await this.dbService.db.select().from(catalogModel)
    const byMake = new Map<string, CatalogSibling[]>()
    for (const r of rows) {
      const list = byMake.get(r.makeSlug) ?? []
      list.push({ model: r.modelSlug, modelName: r.modelName, n: r.n })
      byMake.set(r.makeSlug, list)
    }
    for (const list of byMake.values()) list.sort((a, b) => b.n - a.n)

    const models = new Map<string, CatalogModel>()
    for (const r of rows) {
      const stats = catalogStatsSchema.safeParse(r.stats)
      if (!stats.success) continue
      models.set(`${r.makeSlug}/${r.modelSlug}`, {
        make: r.makeSlug,
        model: r.modelSlug,
        makeName: r.makeName,
        modelName: r.modelName,
        n: r.n,
        yearMin: r.yearMin,
        yearMax: r.yearMax,
        topBrand: r.topRawBrand,
        topModel: r.topRawModel,
        kind: r.kindGroup,
        indexable: r.indexable,
        stats: stats.data,
        siblings: (byMake.get(r.makeSlug) ?? []).filter(s => s.model !== r.modelSlug).slice(0, SIBLINGS)
      })
    }
    const indexable = rows
      .filter(r => r.indexable && models.has(`${r.makeSlug}/${r.modelSlug}`))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, CATALOG_TOP_MODELS)
      .map((r): [string, string] => [r.makeSlug, r.modelSlug])
    const aliases = new Map<string, [string, string]>()
    for (const a of await this.dbService.db.select().from(catalogAlias)) {
      if (models.has(`${a.makeSlug}/${a.modelSlug}`)) aliases.set(aliasKey(a.brand, a.model), [a.makeSlug, a.modelSlug])
    }
    const { makes, makeDetails } = this.buildMakes(
      await this.dbService.db.select().from(catalogMake),
      rows.filter(r => models.has(`${r.makeSlug}/${r.modelSlug}`))
    )
    return { at: Date.now(), models, indexable, aliases, makes, makeDetails }
  }

  /** The make rollups (`catalog_make`) joined with their model rows, both biggest first. */
  private buildMakes(
    makeRows: (typeof catalogMake.$inferSelect)[],
    modelRows: (typeof catalogModel.$inferSelect)[]
  ): Pick<Snapshot, 'makes' | 'makeDetails'> {
    const byMake = new Map<string, (typeof catalogModel.$inferSelect)[]>()
    for (const r of modelRows) byMake.set(r.makeSlug, [...(byMake.get(r.makeSlug) ?? []), r])
    const makeDetails = new Map<string, CatalogMake>()
    for (const m of makeRows) {
      const list = (byMake.get(m.makeSlug) ?? []).sort((a, b) => b.n - a.n)
      if (!list[0]) continue
      makeDetails.set(m.makeSlug, {
        make: m.makeSlug,
        makeName: m.makeName,
        n: m.n,
        modelCount: m.models,
        topBrand: list[0].topRawBrand,
        indexable: list.some(r => r.indexable),
        models: list.map(r => ({
          model: r.modelSlug,
          modelName: r.modelName,
          n: r.n,
          yearMin: r.yearMin,
          yearMax: r.yearMax
        }))
      })
    }
    const makes = [...makeDetails.values()]
      .sort((a, b) => b.n - a.n)
      .map(({ models: _models, ...summary }): CatalogMakeSummary => summary)
    return { makes, makeDetails }
  }
}
