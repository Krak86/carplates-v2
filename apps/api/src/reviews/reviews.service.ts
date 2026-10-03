import { Inject, Injectable } from '@nestjs/common'
import { carVideos, infocarVersions } from '@carplates/db'
import { INFOCAR_TREES, infocarBrandSlug, infocarLookup, videoLookup } from '@carplates/shared'
import type { InfocarRow, ReviewsResponse } from '@carplates/shared'
import { eq } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

type Query = { brand: string; model?: string; year?: number }

@Injectable()
export class ReviewsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /**
   * Matching lives in `@carplates/shared` (`infocarLookup`, `videoLookup`) — persisted catalogs
   * (`pnpm ingest:infocar`, `pnpm ingest:infocar:videos`), not live.
   */
  async lookup(query: Query): Promise<ReviewsResponse> {
    const slug = infocarBrandSlug(query.brand)
    if (!slug) return { testDrive: null, reviews: null, videos: [] }

    const { db } = this.dbService
    const [rows, videoRows] = await Promise.all([
      db.select().from(infocarVersions).where(eq(infocarVersions.brandSlug, slug)),
      db.select().from(carVideos).where(eq(carVideos.brandSlug, slug))
    ])
    const catalog = rows.flatMap((r): InfocarRow[] =>
      INFOCAR_TREES.find(tree => tree === r.tree) ? [{ ...r, tree: r.tree as InfocarRow['tree'] }] : []
    )

    const match = infocarLookup(catalog, query.brand, query.model, query.year)
    const videos = videoLookup(videoRows, catalog, query.brand, query.model, query.year).map(v => ({
      youtubeId: v.youtubeId,
      title: v.title,
      thumbUrl: v.thumbUrl,
      durationS: v.durationS,
      publishedAt: v.publishedAt,
      url: v.url
    }))
    return { testDrive: match.test_drive, reviews: match.reviews, videos }
  }
}
