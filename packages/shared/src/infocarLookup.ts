import { brandSlug } from './brandLogo.js'

/**
 * Lookup of a registry (brand, model, year) in the infocar.ua catalog (`registry.infocar_versions`, see
 * scripts/src/infocar.ts). Pure over the rows it is given. It only ever returns URLs that are in the catalog — that
 * is the dead-link fix for the guessed `reviewLinks` URLs. Fallback order: version page -> model page -> brand page
 * (the brand page is only offered when the catalog has that brand) -> nothing.
 */
export const INFOCAR_TREES = ['test_drive', 'reviews'] as const
export type InfocarTree = (typeof INFOCAR_TREES)[number]

export type InfocarRow = {
  tree: InfocarTree
  brandSlug: string
  modelSlug: string
  modelName: string
  /** null = a model-level row (url is the model page). */
  versionName: string | null
  yearFrom: number | null
  /** null with a `yearFrom` = still in production. */
  yearTo: number | null
  url: string
  reviewCount: number | null
  avgRating: number | null
}

export type InfocarVersionLink = { name: string; yearFrom: number | null; yearTo: number | null; url: string }

export type InfocarMatch = {
  level: 'version' | 'model' | 'brand'
  /** The best link for the level reached. */
  url: string
  modelName: string | null
  /** Every version whose year range contains the year (ranges overlap at the edges), best first. */
  versions: InfocarVersionLink[]
  reviewCount: number | null
  avgRating: number | null
}

export type InfocarMatches = Record<InfocarTree, InfocarMatch | null>

const TREE_PATH: Record<InfocarTree, string> = { test_drive: 'test-drive', reviews: 'reviews' }

const slugify = (text: string): string =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const squash = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Model slugs to try, most specific first: the whole model text, then its first word (`CEED SW` -> `ceed`). */
function modelSlugCandidates(model: string): string[] {
  const full = slugify(model)
  const first = slugify(model.trim().split(/\s+/)[0] ?? '')
  return [...new Set([full, first].filter(Boolean))]
}

function pickVersions(rows: InfocarRow[], model: string, year: number | null, currentYear: number): InfocarRow[] {
  const versions = rows.filter(r => r.versionName !== null)
  if (year === null) return []
  const inRange = versions.filter(r => r.yearFrom !== null && r.yearFrom <= year && year <= (r.yearTo ?? currentYear))
  const wanted = squash(model)
  const rank = (r: InfocarRow): number => {
    const name = squash(r.versionName ?? '')
    if (name === wanted || name === squash(r.modelName) + wanted) return 0
    if (name === squash(r.modelName)) return 1
    return 2
  }
  return inRange.sort((a, b) => rank(a) - rank(b))
}

function matchTree(
  rows: InfocarRow[],
  tree: InfocarTree,
  brand: string,
  model: string,
  year: number | null,
  currentYear: number
): InfocarMatch | null {
  const brandRows = rows.filter(r => r.tree === tree && r.brandSlug === brand)
  if (!brandRows.length) return null

  for (const slug of modelSlugCandidates(model)) {
    const modelRows = brandRows.filter(r => r.modelSlug === slug)
    if (!modelRows.length) continue
    const versions = pickVersions(modelRows, model, year, currentYear)
    const modelRow = modelRows.find(r => r.versionName === null)
    const any = modelRows[0]!
    const stats = modelRow ?? any
    const base = {
      modelName: any.modelName,
      reviewCount: stats.reviewCount,
      avgRating: stats.avgRating
    }
    const toLink = (r: InfocarRow): InfocarVersionLink => ({
      name: r.versionName ?? r.modelName,
      yearFrom: r.yearFrom,
      yearTo: r.yearTo,
      url: r.url
    })
    if (versions.length) return { level: 'version', url: versions[0]!.url, versions: versions.map(toLink), ...base }
    // No version for that year: the model page when the catalog has one, else the model's cheapest known link.
    const modelUrl = modelRow?.url ?? `https://www.infocar.ua/${TREE_PATH[tree]}/${brand}/${slug}/`
    return { level: 'model', url: modelUrl, versions: [], ...base }
  }

  return {
    level: 'brand',
    url: `https://www.infocar.ua/${TREE_PATH[tree]}/${brand}/`,
    modelName: null,
    versions: [],
    reviewCount: null,
    avgRating: null
  }
}

/** Catalog links per infocar tree for a raw registry brand/model/year; a tree with no catalog brand is `null`. */
export function infocarLookup(
  rows: InfocarRow[],
  brand: string | null | undefined,
  model: string | null | undefined,
  year: number | null | undefined,
  currentYear: number = new Date().getFullYear()
): InfocarMatches {
  const slug = brandSlug(brand)
  const none: InfocarMatches = { test_drive: null, reviews: null }
  if (!slug) return none
  const y = year ?? null
  return {
    test_drive: matchTree(rows, 'test_drive', slug, model ?? '', y, currentYear),
    reviews: matchTree(rows, 'reviews', slug, model ?? '', y, currentYear)
  }
}
