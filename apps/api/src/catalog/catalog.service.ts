import { Inject, Injectable, Logger } from '@nestjs/common'
import { catalogModel } from '@carplates/db'
import { CATALOG_TOP_MODELS, catalogStatsSchema } from '@carplates/shared'
import type { CatalogModel, CatalogSibling } from '@carplates/shared'

import { DbService } from '../db/db.service.js'

/** The taxonomy is a few thousand rows; re-read it this often so a monthly `db:refresh-catalog` shows up without a restart. */
const RELOAD_MS = 60 * 60 * 1000
const SIBLINGS = 12

type Snapshot = {
  at: number
  models: Map<string, CatalogModel>
  /** Indexable `[make, model]` pairs, biggest model first. */
  indexable: [string, string][]
}

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

  /** Indexable catalog pages for the sitemap, biggest first. */
  async indexable(): Promise<[string, string][]> {
    return (await this.load()).indexable
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
    return { at: Date.now(), models, indexable }
  }
}
