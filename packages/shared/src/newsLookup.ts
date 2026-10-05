import { modelSlugCandidates } from './infocarLookup.js'
import { findBrandSlug, namesModel, pressTokens, squash, titleYear } from './pressLookup.js'

/**
 * Auto-news (`registry.news_items`, see scripts/src/news.ts). Tagging happens once at ingest (`tagNews`: brand, model
 * and year found in the headline); a request only filters (`newsLookup`), falling back model -> brand. Pure.
 */
export type NewsMatch = 'model' | 'brand'

export type NewsRow = {
  url: string
  source: string
  title: string
  summary: string | null
  imageUrl: string | null
  /** ISO 8601. */
  publishedAt: string
  lang: string
  brandSlug: string | null
  modelSlug: string | null
  year: number | null
}

export type NewsTag = { brandSlug: string | null; modelSlug: string | null; year: number | null }

/** Most items a plate page asks for, and how many of them may be brand-only (so they don't drown model news). */
export const MAX_NEWS = 8
export const MAX_BRAND_ONLY_NEWS = 4
export const MAX_LATEST_NEWS = 12

/**
 * Brand, model and year named in a headline. The brand is looked for in the title, then the feed's categories, then the
 * summary; the model (the longest catalog slug of that brand spelled in the title) and year only in the title.
 */
export function tagNews(
  item: { title: string; summary?: string | null; categories?: string[] },
  brandSlugs: string[],
  modelSlugsOf: (brandSlug: string) => string[]
): NewsTag {
  const brandSlug = findBrandSlug([item.title, ...(item.categories ?? []), item.summary ?? ''], brandSlugs)
  if (!brandSlug) return { brandSlug: null, modelSlug: null, year: titleYear(item.title) }

  const words = pressTokens(item.title)
  const brandTokens = pressTokens(brandSlug)
  const modelSlug =
    [...modelSlugsOf(brandSlug)]
      .sort((a, b) => squash(b).length - squash(a).length)
      .find(slug => squash(slug) && namesModel(words, squash(slug), brandTokens)) ?? null
  return { brandSlug, modelSlug, year: titleYear(item.title) }
}

export type NewsHit = NewsRow & { match: NewsMatch }

const byNewest = (a: NewsRow, b: NewsRow): number => b.publishedAt.localeCompare(a.publishedAt)

/** News for a registry car: its model's items (same model year first), then brand-only ones, newest first. */
export function newsLookup(
  rows: NewsRow[],
  brandSlug: string | null,
  model: string | null | undefined,
  year: number | null | undefined,
  catalogSlugs: string[]
): NewsHit[] {
  if (!brandSlug) return []
  const brandRows = rows.filter(r => r.brandSlug === brandSlug)
  const wanted = new Set(model?.trim() ? modelSlugCandidates(brandSlug, model, catalogSlugs) : [])
  const isModel = (r: NewsRow): boolean => r.modelSlug !== null && wanted.has(r.modelSlug)

  const sameYear = (r: NewsRow): number => (year != null && r.year === year ? 0 : 1)
  const modelHits = brandRows
    .filter(isModel)
    .sort((a, b) => sameYear(a) - sameYear(b) || byNewest(a, b))
    .map((r): NewsHit => ({ ...r, match: 'model' }))
  const brandHits = brandRows
    .filter(r => !isModel(r))
    .sort(byNewest)
    .slice(0, MAX_BRAND_ONLY_NEWS)
    .map((r): NewsHit => ({ ...r, match: 'brand' }))

  return [...modelHits, ...brandHits].slice(0, MAX_NEWS)
}
