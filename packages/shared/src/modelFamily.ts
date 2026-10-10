/**
 * Registry brand/model → one canonical model family for the Ukrainian ZAZ / Daewoo lines. The same car is typed as
 * `DAEWOO LANOS`, `ЗАЗ LANOS`, `ЗАЗ-DAEWOO LANOS`, brand `ЗАЗ` + model `LANOS`, or just a factory code (`T13110`,
 * `110307-42`, `TF69Y`), so grouping by the raw pair splits one model across dozens of rows. Pure and registry-agnostic:
 * rows stay keyed by their raw brand/model; callers use the family to group, label or search.
 */

export type ModelFamily = {
  /** Canonical brand: `ZAZ`, `Daewoo` or `Chevrolet`. */
  brand: string
  /** Canonical model family, e.g. `Lanos`, `Sens`, `Tavria`. */
  family: string
}

const BRAND_TOKENS = new Set(['заз', 'заз-daewoo', 'zaz', 'daewoo', 'fso', 'chevrolet', 'шевроле'])
const CHEVROLET_TOKENS = new Set(['chevrolet', 'шевроле'])

/** Daewoo models that only need their name recognised, in the order they are tested. */
const DAEWOO_MODELS = [
  'Matiz',
  'Nexia',
  'Nubira',
  'Gentra',
  'Leganza',
  'Espero',
  'Tico',
  'Lacetti',
  'Magnus',
  'Evanda',
  'Kalos',
  'Damas'
] as const

const zaz = (family: string): ModelFamily => ({ brand: 'ZAZ', family })

/**
 * The family for a registry brand/model, or null when the row is not a ZAZ/Daewoo model this module knows. Case and
 * spacing do not matter. An explicit name (`SENS`, `LANOS`) always beats a bare factory code.
 */
export function modelFamily(registryBrand: string, registryModel: string): ModelFamily | null {
  const brand = registryBrand.toLowerCase().trim().split(/\s+/)[0] ?? ''
  if (!BRAND_TOKENS.has(brand)) return null
  // Brand and model both carry the name on many rows ("daewoo  lanos" + "lanos"), so test the whole string.
  const text = `${registryBrand} ${registryModel}`.toLowerCase().replace(/\s+/g, ' ')

  if (CHEVROLET_TOKENS.has(brand)) return /\blanos/.test(text) ? { brand: 'Chevrolet', family: 'Lanos' } : null

  if (/\bvida\b/.test(text)) return zaz('Vida')
  if (/\bforza\b/.test(text)) return zaz('Forza')
  if (/\bsens\b/.test(text)) return zaz('Sens')
  if (/lanos/.test(text)) return { brand: 'Daewoo', family: 'Lanos' }

  const model = registryModel.toLowerCase().trim()
  const modelOrBrandCode = `${registryBrand.slice(brand.length)} ${model}`.trim().toLowerCase()
  if (/(^|\s)t1311\d?|(^|\s)t13010/.test(modelOrBrandCode)) return zaz('Sens')
  if (/(^|\s)tf69/.test(modelOrBrandCode) || text.includes('chance') || text.includes('шанс')) return zaz('Chance')

  const code = /(?:^|\s)(\d{4,6})(?:\D|$)/.exec(modelOrBrandCode)?.[1]
  if (code) {
    if (code.startsWith('1102')) return zaz('Tavria')
    if (code.startsWith('1103')) return zaz('Slavuta')
    if (code.startsWith('1105')) return zaz('Dana')
  }
  if (/(^|\s)968/.test(modelOrBrandCode)) return zaz('968')

  for (const name of DAEWOO_MODELS) {
    if (text.includes(name.toLowerCase())) return { brand: 'Daewoo', family: name }
  }
  return null
}
