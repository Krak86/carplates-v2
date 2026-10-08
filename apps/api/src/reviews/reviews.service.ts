import { Inject, Injectable } from '@nestjs/common'
import {
  carVideos,
  infocarVersions,
  ownerPosts,
  pressReviews,
  siteVideos,
  topgearReviews,
  youtubeVideos
} from '@carplates/db'
import {
  INFOCAR_TREES,
  MAX_VIDEOS,
  infocarBrandSlug,
  infocarLookup,
  ownerPostLookup,
  pressLookup,
  topgearLookup,
  videoLookup
} from '@carplates/shared'
import type { InfocarRow, InfocarVideoRow, ReviewsResponse } from '@carplates/shared'
import { eq } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

const LANGS = ['ua', 'ru', 'en'] as const
type Lang = (typeof LANGS)[number]

type Query = { brand: string; model?: string; year?: number }

@Injectable()
export class ReviewsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /**
   * Matching lives in `@carplates/shared` (`infocarLookup`, `videoLookup`, `ownerPostLookup`) — persisted catalogs
   * (`pnpm ingest:infocar`, `pnpm ingest:infocar:videos`, `pnpm ingest:edrive`), not live.
   */
  async lookup(query: Query): Promise<ReviewsResponse> {
    const slug = infocarBrandSlug(query.brand)
    if (!slug) return { testDrive: null, reviews: null, videos: [], ownerPosts: [], topgear: [], press: [] }

    const { db } = this.dbService
    const [rows, videoRows, siteRows, postRows, topgearRows, pressRows] = await Promise.all([
      db.select().from(infocarVersions).where(eq(infocarVersions.brandSlug, slug)),
      db.select().from(carVideos).where(eq(carVideos.brandSlug, slug)),
      db.select().from(siteVideos).where(eq(siteVideos.brandSlug, slug)),
      db.select().from(ownerPosts).where(eq(ownerPosts.brandSlug, slug)),
      db.select().from(topgearReviews).where(eq(topgearReviews.brandSlug, slug)),
      db.select().from(pressReviews).where(eq(pressReviews.brandSlug, slug))
    ])
    const catalog = rows.flatMap((r): InfocarRow[] =>
      INFOCAR_TREES.find(tree => tree === r.tree) ? [{ ...r, tree: r.tree as InfocarRow['tree'] }] : []
    )

    const match = infocarLookup(catalog, query.brand, query.model, query.year)
    const infocarHits = videoLookup(videoRows, catalog, query.brand, query.model, query.year)
    // The brand's own-site articles (`pnpm ingest:honda-videos`) add to infocar's; the same video is shown once.
    const siteHits = videoLookup(
      siteRows.map((r): InfocarVideoRow => ({
        youtubeId: r.youtubeId,
        title: r.title,
        thumbUrl: `https://i.ytimg.com/vi/${r.youtubeId}/mqdefault.jpg`,
        durationS: null,
        publishedAt: r.publishedAt,
        brandSlug: r.brandSlug,
        modelSlug: r.modelSlug,
        generationId: null,
        year: r.year,
        url: `https://www.youtube.com/watch?v=${r.youtubeId}`
      })),
      catalog,
      query.brand,
      query.model,
      query.year
    )
    const infocarIds = new Set(infocarHits.map(v => v.youtubeId))
    const siteIds = new Set(siteHits.map(v => v.youtubeId))
    let videoHits = [...infocarHits, ...siteHits.filter(v => !infocarIds.has(v.youtubeId))].slice(0, MAX_VIDEOS)
    const isFallback = !videoHits.length
    const langById = new Map<string, Lang>()
    if (isFallback) {
      // Fallback for models infocar has no video for (`pnpm ingest:youtube-videos`); queried only when needed.
      const ytRows = await db.select().from(youtubeVideos).where(eq(youtubeVideos.brandSlug, slug))
      for (const r of ytRows) {
        const lang = LANGS.find(l => l === r.lang)
        if (lang) langById.set(r.youtubeId, lang)
      }
      videoHits = videoLookup(
        ytRows.map((r): InfocarVideoRow => ({
          youtubeId: r.youtubeId,
          title: r.title,
          thumbUrl: `https://i.ytimg.com/vi/${r.youtubeId}/mqdefault.jpg`,
          durationS: r.durationS,
          publishedAt: r.publishedAt,
          brandSlug: r.brandSlug,
          modelSlug: r.modelSlug,
          generationId: null,
          year: r.year,
          url: `https://www.youtube.com/watch?v=${r.youtubeId}`
        })),
        catalog,
        query.brand,
        query.model,
        query.year
      )
    }
    const videos = videoHits.map(v => ({
      source: isFallback
        ? ('youtube' as const)
        : infocarIds.has(v.youtubeId) || !siteIds.has(v.youtubeId)
          ? ('infocar' as const)
          : ('site' as const),
      lang: langById.get(v.youtubeId) ?? null,
      youtubeId: v.youtubeId,
      title: v.title,
      thumbUrl: v.thumbUrl,
      durationS: v.durationS,
      publishedAt: v.publishedAt,
      url: v.url
    }))
    const posts = ownerPostLookup(postRows, slug, query.model, query.year).map(p => ({
      postId: p.postId,
      url: p.url,
      title: p.title,
      category: p.category,
      coverUrl: p.coverUrl,
      createdAt: p.createdAt
    }))
    const topgear = topgearLookup(topgearRows, slug, query.model, query.year).map(r => ({
      url: r.url,
      title: r.title,
      rating: r.rating,
      bestRating: r.bestRating,
      publishedAt: r.publishedAt,
      blurb: r.blurb
    }))
    const press = pressLookup(pressRows, slug, query.model, query.year, [
      ...new Set(catalog.map(r => r.modelSlug))
    ]).map(r => ({ url: r.url, source: r.source as 'itc' | 'mezha', publishedAt: r.publishedAt, langs: r.langs }))
    return { testDrive: match.test_drive, reviews: match.reviews, videos, ownerPosts: posts, topgear, press }
  }
}
