import { Inject, Injectable } from '@nestjs/common'
import { infocarVersions } from '@carplates/db'
import { INFOCAR_TREES, infocarBrandSlug, infocarLookup } from '@carplates/shared'
import type { InfocarRow, ReviewsResponse } from '@carplates/shared'
import { eq } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

type Query = { brand: string; model?: string; year?: number }

@Injectable()
export class ReviewsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Matching lives in `@carplates/shared` (`infocarLookup`) — persisted catalog (`pnpm ingest:infocar`), not live. */
  async lookup(query: Query): Promise<ReviewsResponse> {
    const slug = infocarBrandSlug(query.brand)
    if (!slug) return { testDrive: null, reviews: null }

    const rows = await this.dbService.db.select().from(infocarVersions).where(eq(infocarVersions.brandSlug, slug))
    const catalog = rows.flatMap((r): InfocarRow[] =>
      INFOCAR_TREES.find(tree => tree === r.tree) ? [{ ...r, tree: r.tree as InfocarRow['tree'] }] : []
    )

    const match = infocarLookup(catalog, query.brand, query.model, query.year)
    return { testDrive: match.test_drive, reviews: match.reviews }
  }
}
