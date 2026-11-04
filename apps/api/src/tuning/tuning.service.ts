import { Inject, Injectable } from '@nestjs/common'
import { tuningLinks } from '@carplates/db'
import { brandSlug, buildTuningIndex, matchTuning } from '@carplates/shared'
import type { TuningIndex, TuningResponse } from '@carplates/shared'

import { CatalogService } from '../catalog/catalog.service.js'
import { DbService } from '../db/db.service.js'

/** The index is ~2.5k small rows that change only on `pnpm ingest:3dtuning`, so it is read once an hour. */
const INDEX_TTL_MS = 3_600_000

type Query = { brand: string; model: string; year: number; body?: string }

@Injectable()
export class TuningService {
  private cached: { index: TuningIndex; at: number } | null = null

  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(CatalogService) private readonly catalog: CatalogService
  ) {}

  /**
   * The 3DTuning page for this car, or `link: null`. Matching and its safety rules live in `@carplates/shared` (`matchTuning`):
   * only a confident match (one generation, a body class the car can be) yields a link.
   */
  async lookup({ brand, model, year, body }: Query): Promise<TuningResponse> {
    const { page } = await this.catalog.lookup(brand, model)
    const make = page?.make ?? brandSlug(brand)
    if (!make) return { link: null }

    const match = matchTuning(await this.index(), { make, models: page ? [page.model, model] : [model], year, body })
    const hit = match.kind === 'unique' ? match.page : match.kind === 'same-generation' ? match.pages[0] : null
    return {
      link: hit ? { path: hit.path, body: hit.body, generation: hit.generation, startYear: hit.startYear } : null
    }
  }

  private async index(): Promise<TuningIndex> {
    if (this.cached && Date.now() - this.cached.at < INDEX_TTL_MS) return this.cached.index
    const rows = await this.dbService.db.select().from(tuningLinks)
    const index = buildTuningIndex(rows)
    this.cached = { index, at: Date.now() }
    return index
  }
}
