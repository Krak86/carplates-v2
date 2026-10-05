import { Inject, Injectable } from '@nestjs/common'
import { infocarVersions, newsItems } from '@carplates/db'
import type { NewsItemRow } from '@carplates/db'
import { infocarBrandSlug, MAX_LATEST_NEWS, newsLookup } from '@carplates/shared'
import type { NewsResponse, NewsRow } from '@carplates/shared'
import { and, desc, eq } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

type Query = { brand?: string; model?: string; year?: number; lang?: 'uk' | 'ru' | 'en' }

const toRow = (r: NewsItemRow): NewsRow => ({ ...r, publishedAt: r.publishedAt.toISOString() })

@Injectable()
export class NewsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Matching lives in `@carplates/shared` (`newsLookup`); tagging happened at ingest (`tagNews`). */
  async lookup(query: Query): Promise<NewsResponse> {
    const { db } = this.dbService
    const inLang = query.lang ? eq(newsItems.lang, query.lang) : undefined

    if (!query.brand) {
      const rows = await db
        .select()
        .from(newsItems)
        .where(inLang)
        .orderBy(desc(newsItems.publishedAt))
        .limit(MAX_LATEST_NEWS)
      return { items: rows.map(r => ({ ...toRow(r), match: null })) }
    }

    const slug = infocarBrandSlug(query.brand)
    if (!slug) return { items: [] }
    const [rows, catalog] = await Promise.all([
      db
        .select()
        .from(newsItems)
        .where(and(eq(newsItems.brandSlug, slug), inLang))
        .orderBy(desc(newsItems.publishedAt))
        .limit(200),
      db
        .selectDistinct({ slug: infocarVersions.modelSlug })
        .from(infocarVersions)
        .where(eq(infocarVersions.brandSlug, slug))
    ])
    return {
      items: newsLookup(
        rows.map(toRow),
        slug,
        query.model,
        query.year,
        catalog.map(c => c.slug)
      )
    }
  }
}
