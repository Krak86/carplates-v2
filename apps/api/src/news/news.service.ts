import { Inject, Injectable } from '@nestjs/common'
import { infocarVersions, newsItems } from '@carplates/db'
import type { NewsItemRow } from '@carplates/db'
import { infocarBrandSlug, MAX_LATEST_NEWS, newsLookup } from '@carplates/shared'
import type { NewsFeedPageResponse, NewsFeedResponse, NewsRow } from '@carplates/shared'
import { and, asc, count, desc, eq, ilike, inArray, max, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

type Query = { brand?: string; model?: string; year?: number; lang?: 'uk' | 'ru' | 'en' }
type PageQuery = {
  sources?: string[]
  q?: string
  order: 'asc' | 'desc'
  lang?: 'uk' | 'ru' | 'en'
  page: number
  pageSize: number
}

/** Escape LIKE wildcards so the user's text is matched literally. */
const likePattern = (q: string): string => `%${q.replace(/[\\%_]/g, '\\$&')}%`

const toRow = (r: NewsItemRow): NewsRow => ({ ...r, publishedAt: r.publishedAt.toISOString() })

@Injectable()
export class NewsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** When `pnpm ingest:news` last stored a headline (null = never ran). */
  private async updatedAt(): Promise<string | null> {
    const [row] = await this.dbService.db.select({ at: max(newsItems.fetchedAt) }).from(newsItems)
    return row?.at ? new Date(row.at).toISOString() : null
  }

  /** The /news archive: newest first, optionally narrowed to some sources; `sources` always counts the whole language slice. */
  async list(query: PageQuery): Promise<NewsFeedPageResponse> {
    const { db } = this.dbService
    const inLang = query.lang ? eq(newsItems.lang, query.lang) : undefined
    const inSources = query.sources?.length ? inArray(newsItems.source, query.sources) : undefined
    const inTitle = query.q ? ilike(newsItems.title, likePattern(query.q)) : undefined
    const where = and(inLang, inSources, inTitle)
    const byDate = query.order === 'asc' ? asc(newsItems.publishedAt) : desc(newsItems.publishedAt)

    const [rows, [totalRow], sources, updatedAt] = await Promise.all([
      db
        .select()
        .from(newsItems)
        .where(where)
        .orderBy(byDate, newsItems.url)
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ total: count() }).from(newsItems).where(where),
      db
        .select({ source: newsItems.source, count: count() })
        .from(newsItems)
        .where(inLang)
        .groupBy(newsItems.source)
        .orderBy(sql`count(*) desc`),
      this.updatedAt()
    ])
    return {
      items: rows.map(r => ({ ...toRow(r), match: null })),
      total: totalRow?.total ?? 0,
      page: query.page,
      pageSize: query.pageSize,
      sources,
      updatedAt
    }
  }

  /** Matching lives in `@carplates/shared` (`newsLookup`); tagging happened at ingest (`tagNews`). */
  async lookup(query: Query): Promise<NewsFeedResponse> {
    const { db } = this.dbService
    const inLang = query.lang ? eq(newsItems.lang, query.lang) : undefined

    if (!query.brand) {
      const [rows, updatedAt] = await Promise.all([
        db.select().from(newsItems).where(inLang).orderBy(desc(newsItems.publishedAt)).limit(MAX_LATEST_NEWS),
        this.updatedAt()
      ])
      return { items: rows.map(r => ({ ...toRow(r), match: null })), updatedAt }
    }

    const slug = infocarBrandSlug(query.brand)
    if (!slug) return { items: [], updatedAt: await this.updatedAt() }
    const [rows, catalog, updatedAt] = await Promise.all([
      db
        .select()
        .from(newsItems)
        .where(and(eq(newsItems.brandSlug, slug), inLang))
        .orderBy(desc(newsItems.publishedAt))
        .limit(200),
      db
        .selectDistinct({ slug: infocarVersions.modelSlug })
        .from(infocarVersions)
        .where(eq(infocarVersions.brandSlug, slug)),
      this.updatedAt()
    ])
    return {
      items: newsLookup(
        rows.map(toRow),
        slug,
        query.model,
        query.year,
        catalog.map(c => c.slug)
      ),
      updatedAt
    }
  }
}
