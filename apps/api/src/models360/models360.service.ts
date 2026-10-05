import { Inject, Injectable } from '@nestjs/common'
import { carModels360 } from '@carplates/db'
import { infocarBrandSlug, model360Lookup } from '@carplates/shared'
import type { Models360Response } from '@carplates/shared'
import { eq } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

@Injectable()
export class Models360Service {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Matching lives in `@carplates/shared` (`model360Lookup`) — a persisted catalog (`pnpm ingest:carshow360`), not live. */
  async lookup(brand: string, model: string): Promise<Models360Response> {
    const slug = infocarBrandSlug(brand)
    if (!slug) return { models: [] }

    const rows = await this.dbService.db.select().from(carModels360).where(eq(carModels360.brandSlug, slug))
    const models = model360Lookup(rows, slug, model).map(r => ({
      id: r.id,
      brandSlug: r.brandSlug,
      modelSlug: r.modelSlug,
      slug: r.slug,
      label: r.label,
      title: r.title
    }))
    return { models }
  }
}
