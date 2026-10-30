import { brandSlug } from './brandLogo.js'
import { modelFamily } from './modelFamily.js'
import { brandCandidateKey, modelKey } from './vehicleKey.js'
import { wikiSearchName } from './wikiAliases.js'

/**
 * Registry brand/model → the catalog page it belongs to (`/cars/{make}/{model}`). Composes the existing canonicalisers
 * (`brandSlug`, `modelFamily`, `wikiSearchName`, `brandCandidateKey`) and finishes with a MotFold-style whole-word prefix
 * fold against a set of known models, so trims and engine codes ("SPRINTER 313 CDI", "XF 105.460") land on their model.
 * Pure: the known-model set is injected (the build script assembles it from MOT, VehiclesDB, `model_generations` and the
 * overrides CSV).
 */

/** The rule that decided a mapping, strongest first. */
export const CATALOG_HOWS = ['family', 'wiki', 'fold', 'series', 'raw'] as const
export type CatalogHow = (typeof CATALOG_HOWS)[number]

export type CatalogSlugs = {
  /** Kebab-case make, the `brandSlug` form: `mercedes-benz`, `lada`, `zaz`. */
  make: string
  /** Model key (letters and digits only, the `modelKey` form): `3series`, `sprinter`, `landcruiserprado`, `lanos`. */
  model: string
  how: CatalogHow
}

/** Known models as `makeKey|modelKey` (alphanumeric make, e.g. `mercedesbenz|sprinter`). Never folded, valid fold targets. */
export type KnownModels = ReadonlySet<string>

/** Families that get one page under another make than `modelFamily().brand` (decided: Lanos is `zaz/lanos`). */
const FAMILY_MAKE: Readonly<Record<string, string>> = { Lanos: 'zaz' }

const alnum = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '')

/** Kebab make for a raw registry brand. The brand text may carry the model ("ваз 21063"), so the first word is a fallback. */
function makeSlug(brand: string): string | null {
  const first = brand.trim().split(/\s+/)[0]
  return brandSlug(brand) ?? brandSlug(first) ?? null
}

/**
 * The model key to count a registry model under: the longest whole-word prefix of `text` that is a known model, else
 * `modelKey(text)`. A known model itself is never folded ("range rover sport" keeps its own key).
 */
export function foldKnownModel(known: KnownModels, mk: string, text: string): string {
  const own = `${mk}|`
  const key = modelKey(text) ?? ''
  if (!key || known.has(own + key)) return key
  const words = text.trim().split(/\s+/)
  for (let n = words.length - 1; n >= 1; n--) {
    const prefix = modelKey(words.slice(0, n).join(' '))
    if (prefix && known.has(own + prefix)) return prefix
  }
  return key
}

/**
 * The catalog make + model for a raw registry brand/model, or null when the make is unknown or the model has no Latin
 * letters or digits (Cyrillic-only text cannot be a slug).
 */
export function catalogSlugs(
  brand: string | null | undefined,
  model: string | null | undefined,
  known: KnownModels = new Set()
): CatalogSlugs | null {
  if (!brand || !model) return null

  // ZAZ / Daewoo / Chevrolet lines: one canonical family, make from the family (Lanos is `zaz/lanos` whatever the brand).
  const family = modelFamily(brand, model)
  if (family) {
    const make = FAMILY_MAKE[family.family] ?? brandSlug(family.brand) ?? alnum(family.brand)
    const key = modelKey(family.family)
    return key ? { make, model: key, how: 'family' } : null
  }

  let make = makeSlug(brand)
  let text = model.trim()
  let how: CatalogHow = 'raw'
  const wiki = wikiSearchName(brand, model)
  if (wiki) {
    // Factory codes and engine-code names ("21099", "320D") become the model name; a repeated brand text passes through.
    make = makeSlug(wiki.brand) ?? make
    text = wiki.model
    how = 'wiki'
  }
  if (!make) return null
  const mk = alnum(make)

  // Run the fold on the wiki pass-through too ("sprinter 313 cdi" and "land cruiser 200" are not aliases, only repeats).
  let key = foldKnownModel(known, mk, text)
  if (!key) return null
  if (key !== modelKey(text)) how = 'fold'
  else if (!known.has(`${mk}|${key}`)) {
    const series = brandCandidateKey(mk, key)
    if (series) {
      key = series
      how = 'series'
    }
  }
  return { make, model: key, how }
}
