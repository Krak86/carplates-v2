import { CATALOG_KEEP_MIN_CARS, CATALOG_MIN_CARS, CATALOG_TOP_MODELS, catalogSlugs, modelKey } from '@carplates/shared'
import type { CatalogHow, KnownModels } from '@carplates/shared'

import type { CatalogOverrides } from './catalog-overrides.js'

export type RawPair = { brand: string; model: string; n: number }
export type AliasRow = {
  brand: string
  model: string
  makeSlug: string
  modelSlug: string
  how: CatalogHow | 'override'
}
export type ModelAgg = {
  makeSlug: string
  modelSlug: string
  n: number
  topBrand: string
  topModel: string
  rank: number
  indexable: boolean
}

/** Maps every raw pair to a page (overrides first) and sums the pairs of one page; sorted by `n`, ranked, thin pages kept. */
export function buildTaxonomy(
  pairs: readonly RawPair[],
  known: KnownModels,
  overrides: CatalogOverrides
): { aliases: AliasRow[]; models: ModelAgg[] } {
  const aliases: AliasRow[] = []
  const byPage = new Map<string, ModelAgg & { topN: number }>()
  for (const p of pairs) {
    const forced = overrides.alias.get(`${p.brand}|${p.model}`)
    const hit = forced
      ? { make: forced.make, model: forced.model, how: 'override' as const }
      : catalogSlugs(p.brand, p.model, known)
    if (!hit) continue
    const merged = overrides.fold.get(`${hit.make}/${hit.model}`)
    const make = merged?.make ?? hit.make
    const model = merged?.model ?? hit.model
    const key = `${make}/${model}`
    if (overrides.drop.has(key)) continue
    aliases.push({
      brand: p.brand,
      model: p.model,
      makeSlug: make,
      modelSlug: model,
      how: merged ? 'override' : hit.how
    })
    const cur = byPage.get(key)
    if (!cur) {
      byPage.set(key, {
        makeSlug: make,
        modelSlug: model,
        n: p.n,
        topBrand: p.brand,
        topModel: p.model,
        rank: 0,
        indexable: false,
        topN: p.n
      })
      continue
    }
    cur.n += p.n
    if (p.n > cur.topN) Object.assign(cur, { topBrand: p.brand, topModel: p.model, topN: p.n })
  }
  const models = [...byPage.values()]
    .filter(m => m.n >= CATALOG_KEEP_MIN_CARS)
    .sort((a, b) => b.n - a.n || a.makeSlug.localeCompare(b.makeSlug) || a.modelSlug.localeCompare(b.modelSlug))
    .map(({ topN: _topN, ...m }, i) => ({
      ...m,
      rank: i + 1,
      indexable: m.n >= CATALOG_MIN_CARS && i < CATALOG_TOP_MODELS
    }))
  return { aliases, models }
}

const SMALL_WORDS_KEEP_UPPER = 3

/** "LAND CRUISER" -> "Land Cruiser"; short words and anything with a digit stay as typed ("BMW", "X5", "CDI"). */
export function prettify(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t !== t.toUpperCase()) return t
  return t
    .split(' ')
    .map(w => (/\d/.test(w) || w.length <= SMALL_WORDS_KEEP_UPPER ? w : w[0] + w.slice(1).toLowerCase()))
    .join(' ')
}

/** Display name of a make slug when VehiclesDB has none: "mercedes-benz" -> "Mercedes-Benz", "bmw" -> "BMW". */
export function makeNameFromSlug(slug: string): string {
  if (slug.length <= 3) return slug.toUpperCase()
  return slug.replace(/(^|-)([a-z])/g, (_, sep: string, c: string) => sep + c.toUpperCase())
}

/** Display name of a model key when no catalog names it: series/class codes get their words, else the top raw spelling. */
export function modelNameFromKey(key: string, topRawModel: string): string {
  const series = /^(\d)series$/.exec(key)
  if (series) return `${series[1]} Series`
  const cls = /^([a-z]{1,3})class$/.exec(key)
  if (cls) return `${cls[1]!.toUpperCase()}-Class`
  return modelKey(topRawModel) === key ? prettify(topRawModel) : key.toUpperCase()
}
