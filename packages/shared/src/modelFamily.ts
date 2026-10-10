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

/**
 * The ZAZ family a factory code names, in model text that is already lower-cased: `t1311x` / `t13010` → Sens, `tf69…` →
 * Chance, `1102…` → Tavria, `1103…` → Slavuta, `1105…` → Dana, `968…` → 968. By default a code counts at the start of the
 * text or after a space (`sens t1311`); `leading` accepts it only at the start, after an optional "sens " (the photo search,
 * where a trailing code such as "lanos t13110" is still a Lanos). Null for anything else; explicit names are the caller's job.
 */
export function zazFactoryFamily(text: string, leading = false): string | null {
  const at = leading ? '^(?:sens )?' : '(?:^|\\s)'
  if (new RegExp(`${at}t1311|${at}t13010`).test(text)) return 'Sens'
  if (new RegExp(`${at}tf69`).test(text)) return 'Chance'
  const code = (leading ? /^(\d{4})/ : /(?:^|\s)(\d{4,6})(?:\D|$)/).exec(text)?.[1]
  if (code) {
    if (code.startsWith('1102')) return 'Tavria'
    if (code.startsWith('1103')) return 'Slavuta'
    if (code.startsWith('1105')) return 'Dana'
  }
  if (!leading && /(^|\s)968/.test(text)) return '968'
  return null
}

/**
 * Photo-search names (Commons title search + Wikipedia lead query) for the families Commons / Wikipedia know under another
 * name than the registry does. `wikiSearchName` reads this table; keys are `ModelFamily.family`.
 */
export const ZAZ_FAMILY_SEARCH: Readonly<Record<string, { brand: string; model: string; leadQuery: string }>> = {
  Sens: { brand: 'ZAZ', model: 'Sens', leadQuery: 'ЗАЗ Сенс' },
  Lanos: { brand: 'Daewoo', model: 'Lanos', leadQuery: 'Daewoo Lanos' },
  Nubira: { brand: 'Daewoo', model: 'Nubira', leadQuery: 'Daewoo Nubira' },
  Tavria: { brand: 'ZAZ', model: 'Tavria', leadQuery: 'ЗАЗ-1102 Таврія' },
  Slavuta: { brand: 'ZAZ', model: 'Slavuta', leadQuery: 'ЗАЗ-1103 Славута' },
  Dana: { brand: 'ZAZ', model: 'Dana', leadQuery: 'ЗАЗ-1105 Дана' },
  Chance: { brand: 'ZAZ', model: 'Chance', leadQuery: 'ЗАЗ Шанс' }
}

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
  const byCode = zazFactoryFamily(modelOrBrandCode)
  if (byCode === 'Sens') return zaz(byCode)
  if (byCode === 'Chance' || text.includes('chance') || text.includes('шанс')) return zaz('Chance')
  if (byCode) return zaz(byCode)

  for (const name of DAEWOO_MODELS) {
    if (text.includes(name.toLowerCase())) return { brand: 'Daewoo', family: name }
  }
  return null
}
