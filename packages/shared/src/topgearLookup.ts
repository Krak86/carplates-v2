import { modelSlugCandidates } from './infocarLookup.js'

/**
 * Picks TopGear UK reviews (`registry.topgear_reviews`, see scripts/src/topgear.ts) for a registry (brand, model, year).
 * Pure over the rows it is given. Matching reuses infocar's model-slug candidates (`CEE'D` -> `ceed`) and also accepts a
 * variant of one (`ceed-sportswagon`, `sorento-0`). TopGear has no per-year pages: a slug carrying a year range
 * (`sportage-2017-2021`) only matches a car inside it; rows without a range always match (coarse generation matching).
 * Best match first: the model itself before its variants, then the generation covering the year, then the newest review.
 */
export type TopgearLookupRow = {
  url: string
  /** TopGear's model URL segment, e.g. `sportage-2017-2021`. */
  modelSlug: string
  brandSlug: string | null
  title: string
  rating: number | null
  bestRating: number | null
  /** `YYYY-MM-DD`. */
  publishedAt: string | null
  yearFrom: number | null
  yearTo: number | null
  blurb: string | null
}

export const MAX_TOPGEAR_REVIEWS = 5

const stripYearRange = (slug: string): string => slug.replace(/-(?:19|20)\d{2}-(?:19|20)\d{2}$/, '')

export function topgearLookup(
  rows: TopgearLookupRow[],
  brandSlug: string | null,
  model: string | null | undefined,
  year: number | null | undefined
): TopgearLookupRow[] {
  if (!brandSlug || !model?.trim()) return []
  const brandRows = rows.filter(r => r.brandSlug === brandSlug)
  const slugs = [...new Set(brandRows.map(r => stripYearRange(r.modelSlug)))]
  const inRange = (r: TopgearLookupRow): boolean =>
    year == null || r.yearFrom === null || r.yearTo === null || (r.yearFrom <= year && year <= r.yearTo)
  const covers = (r: TopgearLookupRow): boolean =>
    year != null && r.yearFrom !== null && r.yearTo !== null && inRange(r)

  // The first candidate that has any review wins (candidates run most specific first).
  for (const candidate of modelSlugCandidates(brandSlug, model, slugs)) {
    // The model itself: its slug, optionally with a year range and/or a one-digit duplicate suffix (`sorento-0`).
    const isModel = (r: TopgearLookupRow): boolean => {
      const base = stripYearRange(r.modelSlug)
      return base === candidate || (base.startsWith(`${candidate}-`) && /^\d$/.test(base.slice(candidate.length + 1)))
    }
    const hits = brandRows.filter(r => {
      const base = stripYearRange(r.modelSlug)
      return base === candidate || base.startsWith(`${candidate}-`)
    })
    if (!hits.length) continue
    return hits
      .filter(inRange)
      .sort(
        (a, b) =>
          Number(!isModel(a)) - Number(!isModel(b)) ||
          Number(!covers(a)) - Number(!covers(b)) ||
          (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')
      )
      .slice(0, MAX_TOPGEAR_REVIEWS)
  }
  return []
}
