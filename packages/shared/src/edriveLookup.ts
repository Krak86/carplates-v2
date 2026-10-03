import { modelSlugCandidates, slugify } from './infocarLookup.js'

/**
 * Picks e-drive.com.ua owner posts (`registry.owner_posts`, see scripts/src/edrive.ts) for a registry (brand, model,
 * year). Pure over the rows it is given. Matching reuses infocar's model-slug candidates (`CEE'D` -> `ceed`) and also
 * accepts a variant of one (`passat-variant`). Each post carries the year range of the generation it was filed under, so
 * a 2017 car gets its own generation's posts only; without a car year nothing is filtered. Newest first.
 */
export type OwnerPostLookupRow = {
  postId: number
  url: string
  title: string
  category: string | null
  coverUrl: string | null
  /** `YYYY-MM-DD`. */
  createdAt: string | null
  brandSlug: string
  modelSlug: string
  /** null = the generation's start year is unknown. */
  yearFrom: number | null
  /** null with a `yearFrom` = still in production. */
  yearTo: number | null
}

export const MAX_OWNER_POSTS = 30

/** The model slug an e-drive model name is stored under (`Cee'd` -> `ceed`, `Grand Cherokee` -> `grand-cherokee`). */
export const edriveModelSlug = (name: string): string => slugify(name.replace(/['’`]/g, ''))

export function ownerPostLookup(
  rows: OwnerPostLookupRow[],
  brandSlug: string | null,
  model: string | null | undefined,
  year: number | null | undefined,
  currentYear: number = new Date().getFullYear()
): OwnerPostLookupRow[] {
  if (!brandSlug || !model?.trim()) return []
  const brandRows = rows.filter(r => r.brandSlug === brandSlug)
  const slugs = [...new Set(brandRows.map(r => r.modelSlug))]
  const inGeneration = (r: OwnerPostLookupRow): boolean =>
    year == null || r.yearFrom === null || (r.yearFrom <= year && year <= (r.yearTo ?? currentYear))

  // The first candidate that has any post wins (candidates run most specific first).
  for (const candidate of modelSlugCandidates(brandSlug, model, slugs)) {
    const hits = brandRows.filter(r => r.modelSlug === candidate || r.modelSlug.startsWith(`${candidate}-`))
    if (!hits.length) continue
    return hits
      .filter(inGeneration)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, MAX_OWNER_POSTS)
  }
  return []
}
