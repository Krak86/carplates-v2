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
  /** Model page pre-filtered to the car's year (+1 year of margin) — owner reviews only; null when not applicable. */
  yearUrl: string | null
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

/** Our brand slugs that infocar spells differently (`brandSlug` follows Euro NCAP's scheme). */
const INFOCAR_BRAND_ALIAS: Readonly<Record<string, string>> = {
  'mercedes-benz': 'mercedes',
  ssangyong: 'ssang-yong',
  lada: 'vaz'
}

/** The brand slug as infocar.ua spells it, or null for an unrecognised brand. */
export function infocarBrandSlug(brand: string | null | undefined): string | null {
  const slug = brandSlug(brand)
  return slug ? (INFOCAR_BRAND_ALIAS[slug] ?? slug) : null
}

/** Registry models that are a trim of a differently-named infocar model (`328I` -> `3-series`, `E 200` -> `e-class`). */
function aliasSlugs(brand: string, model: string): string[] {
  const text = model.trim().toLowerCase()
  if (brand === 'bmw') {
    const series = /^([1-8])\d{2}/.exec(text)
    return series ? [`${series[1]}-series`] : []
  }
  if (brand === 'mercedes') {
    const letters = /^([a-z]{1,3})[\s-]?\d/.exec(text)?.[1]
    if (!letters) return []
    return [`${letters === 'ml' ? 'm' : letters}-class`]
  }
  if (brand === 'volkswagen') {
    if (text === 'cc') return ['passat-cc']
    if (text === 'beetle') return ['new-beetle']
    if (text.startsWith('e-golf')) return ['golf']
  }
  if (brand === 'mitsubishi' && text.startsWith('pajero')) return ['pajero-wagon']
  if (brand === 'kia' && text === 'forte') return ['cerato']
  return []
}

const tokens = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

/** Catalog slugs whose words are a leading run of the model's words, longest first (`LAND CRUISER PRADO 150`). */
function prefixSlugs(model: string, catalogSlugs: string[]): string[] {
  const words = tokens(model)
  return catalogSlugs
    .map(slug => ({ slug, parts: slug.split('-') }))
    .filter(({ parts }) => parts.length <= words.length && parts.every((part, i) => part === words[i]))
    .sort((x, y) => y.parts.length - x.parts.length)
    .map(x => x.slug)
}

/** A single-word model that is one word of exactly one catalog slug (`PRADO` -> `land-cruiser-prado`). */
function wordSlug(model: string, catalogSlugs: string[]): string[] {
  const words = tokens(model)
  if (words.length !== 1) return []
  const hits = catalogSlugs.filter(slug => slug.split('-').includes(words[0]!))
  return hits.length === 1 ? hits : []
}

/** Numeric factory codes lose trailing modification digits until a catalog model matches (`21063` -> `2106`). */
function codePrefixSlugs(model: string, catalogSlugs: string[]): string[] {
  const code = /^\d{4,}/.exec(tokens(model)[0] ?? '')?.[0]
  if (!code) return []
  const out: string[] = []
  for (let len = code.length; len >= 3; len--) {
    const prefix = code.slice(0, len)
    out.push(prefix, ...wordSlug(prefix, catalogSlugs))
  }
  return out
}

/** Model slugs to try, most specific first: the whole model text, its first word, brand aliases, then catalog fuzzy matches. */
export function modelSlugCandidates(brand: string, model: string, catalogSlugs: string[]): string[] {
  const full = slugify(model)
  const firstWord = model.trim().split(/\s+/)[0] ?? ''
  // `squash` drops punctuation entirely: registry `CEE'D` -> `ceed` (slugify alone gives `cee-d`, which isn't a slug).
  const direct = [full, slugify(firstWord), squash(model), squash(firstWord)]
  const all = [
    ...direct,
    ...aliasSlugs(brand, model),
    ...prefixSlugs(model, catalogSlugs),
    ...wordSlug(model, catalogSlugs),
    ...codePrefixSlugs(model, catalogSlugs)
  ]
  return [...new Set(all.filter(Boolean))]
}

function pickVersions(rows: InfocarRow[], model: string, year: number | null, currentYear: number): InfocarRow[] {
  const versions = rows.filter(r => r.versionName !== null)
  if (year === null) return []
  // Same window as the year-filtered reviews link (year .. year+1): versions overlapping it, ones covering the year first.
  const windowEnd = Math.min(year + 1, currentYear)
  const covers = (r: InfocarRow): boolean => r.yearFrom! <= year && year <= (r.yearTo ?? currentYear)
  const inRange = versions.filter(
    r => r.yearFrom !== null && r.yearFrom <= windowEnd && year <= (r.yearTo ?? currentYear)
  )
  const wanted = squash(model)
  const rank = (r: InfocarRow): number => {
    const name = squash(r.versionName ?? '')
    if (name === wanted || name === squash(r.modelName) + wanted) return 0
    if (name === squash(r.modelName)) return 1
    return 2
  }
  return inRange.sort((a, b) => Number(!covers(a)) - Number(!covers(b)) || rank(a) - rank(b))
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

  const catalogSlugs = [...new Set(brandRows.map(r => r.modelSlug))]
  for (const slug of modelSlugCandidates(brand, model, catalogSlugs)) {
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
    // No version for that year: the model page when the catalog has one, else the model's cheapest known link.
    const modelUrl = modelRow?.url ?? `https://www.infocar.ua/${TREE_PATH[tree]}/${brand}/${slug}/`
    // Only the owner-reviews tree has the `y1`/`y2` year filter; test-drive pages ignore it.
    const yearUrl =
      tree === 'reviews' && year !== null ? `${modelUrl}?y1=${year}&y2=${Math.min(year + 1, currentYear)}&sort=0` : null
    if (versions.length) {
      return { level: 'version', url: versions[0]!.url, versions: versions.map(toLink), yearUrl, ...base }
    }
    return { level: 'model', url: modelUrl, versions: [], yearUrl, ...base }
  }

  return {
    level: 'brand',
    url: `https://www.infocar.ua/${TREE_PATH[tree]}/${brand}/`,
    modelName: null,
    versions: [],
    reviewCount: null,
    avgRating: null,
    yearUrl: null
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
  const slug = infocarBrandSlug(brand)
  const none: InfocarMatches = { test_drive: null, reviews: null }
  if (!slug) return none
  const y = year ?? null
  return {
    test_drive: matchTree(rows, 'test_drive', slug, model ?? '', y, currentYear),
    reviews: matchTree(rows, 'reviews', slug, model ?? '', y, currentYear)
  }
}
