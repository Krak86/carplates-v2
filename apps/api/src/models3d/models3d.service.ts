import { Inject, Injectable } from '@nestjs/common'
import { carModels3d } from '@carplates/db'
import { infocarBrandSlug, model3dLookup } from '@carplates/shared'
import type { Models3dResponse } from '@carplates/shared'
import { eq } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

@Injectable()
export class Models3dService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Matching lives in `@carplates/shared` (`model3dLookup`) — a persisted catalog (`pnpm ingest:sketchfab`), not live. */
  async lookup(brand: string, model: string): Promise<Models3dResponse> {
    const slug = infocarBrandSlug(brand)
    if (!slug) return { models: [] }

    const rows = await this.dbService.db.select().from(carModels3d).where(eq(carModels3d.brandSlug, slug))
    const models = model3dLookup(rows, slug, model).map(r => ({
      uid: r.uid,
      name: r.name,
      year: r.year,
      authorName: r.authorName,
      authorUrl: r.authorUrl,
      thumbUrl: r.thumbUrl,
      viewCount: r.viewCount,
      likeCount: r.likeCount,
      license: r.license
    }))
    return { models }
  }
}
