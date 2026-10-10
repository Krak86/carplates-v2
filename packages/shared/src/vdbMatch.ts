import { modelFamily } from './modelFamily.js'
import { brandCandidateKey, modelKey } from './vehicleKey.js'

/** The catalog fields matching needs — structurally satisfied by `registry.vdb_models` rows. */
export type VdbReferenceRow = {
  kind: string
  makeKey: string
  modelKey: string
  bodyTypes: string[]
  countries: string[]
  regions: string[]
  globalDecile: number | null
  aliases: string[]
}

/** The fields matching itself needs — shared by the VehiclesDB catalog and the RDW specs (`rdwMatch.ts`). */
export type ModelReferenceRow = {
  kind: string
  makeKey: string
  modelKey: string
  aliases: string[]
  /** Tie-break among equals; absent for sources with no popularity ranking. */
  globalDecile?: number | null
}

/** How a registry model reached its catalog row, strongest first. */
export type VdbMatchHow = 'exact' | 'alias' | 'series' | 'prefix'

export type VdbMatch<T extends ModelReferenceRow> = { row: T; how: VdbMatchHow }

/** A prefix match on a shorter key is too ambiguous ("a" would hit every model starting with a). */
export const MIN_PREFIX_KEY_LENGTH = 3

/** Car-like kinds win over motorcycles/trucks when a name exists in several ("Transit" is a van, "Boxer" too). */
const KIND_RANK: Readonly<Record<string, number>> = { car: 0, van: 1 }
const kindRank = (kind: string, kinds?: readonly string[]): number => {
  if (!kinds) return KIND_RANK[kind] ?? 2
  const i = kinds.indexOf(kind)
  return i < 0 ? kinds.length : i
}

/** Vehicle classes the catalog can speak for; trailers, special machines and the like have no catalog counterpart. */
export const VDB_VEHICLE_CLASSES = ['car', 'motorcycle', 'truck', 'bus'] as const
export type VdbVehicleClass = (typeof VDB_VEHICLE_CLASSES)[number]

/** Registry `kind` text (upper-case, as published) → vehicle class. */
const VEHICLE_CLASS_BY_REGISTRY_KIND: Readonly<Record<string, VdbVehicleClass>> = {
  ЛЕГКОВИЙ: 'car',
  МОТОЦИКЛ: 'motorcycle',
  МОТОТРИЦИКЛ: 'motorcycle',
  КВАДРОЦИКЛ: 'motorcycle',
  ТРИЦИКЛ: 'motorcycle',
  МОПЕД: 'motorcycle',
  ВАНТАЖНИЙ: 'truck',
  АВТОБУС: 'bus'
}

/** Null when the registry kind has no catalog counterpart (trailers, special vehicles, unknown). */
export function vdbVehicleClass(registryKind: string | null | undefined): VdbVehicleClass | null {
  return VEHICLE_CLASS_BY_REGISTRY_KIND[registryKind?.trim().toUpperCase() ?? ''] ?? null
}

/**
 * Catalog kinds a class may match, most preferred first. Cars stay unrestricted (undefined: car and van rows win, the
 * rest still match) so passenger-car coverage is unchanged. The registry files vans and pickups under ВАНТАЖНИЙ and
 * minibuses under АВТОБУС, hence the van/car rows in those lists.
 */
const CATALOG_KINDS_BY_CLASS: Readonly<Record<VdbVehicleClass, readonly string[] | undefined>> = {
  car: undefined,
  motorcycle: ['motorcycle', 'moped'],
  truck: ['truck', 'van', 'car'],
  bus: ['bus', 'van']
}
export const vdbCatalogKinds = (cls: VdbVehicleClass): readonly string[] | undefined => CATALOG_KINDS_BY_CLASS[cls]

/**
 * The registry sometimes doubles the model name ("TRANSIT TRANSIT", "ABARTH  500" style padding) —
 * keep one copy when the whitespace-separated words are the same sequence twice.
 */
export function collapseDoubledModel(model: string): string {
  const words = model.trim().split(/\s+/).filter(Boolean)
  if (words.length < 2 || words.length % 2 !== 0) return words.join(' ')
  const half = words.length / 2
  const first = words.slice(0, half).join(' ')
  return first.toLowerCase() === words.slice(half).join(' ').toLowerCase() ? first : words.join(' ')
}

/**
 * Curated registry spellings the generic rules can't reach, per make key: [registry model key pattern, catalog key].
 * Only entries verified against both the registry and the catalog belong here — a wrong alias shows wrong data.
 */
const MODEL_ALIASES: Readonly<Record<string, readonly (readonly [RegExp, string])[]>> = {
  // GAZ-3102/31029/3110/31105 are all the Volga; the catalog has one "Volga" entry.
  gaz: [[/^31(02|05|10|29)/, 'volga']],
  // "PRADO" is the bare nameplate of the Land Cruiser Prado.
  toyota: [[/^prado/, 'landcruiserprado']],
  // Registry spells the class as letter + engine figure (S 500); the catalog's S/V/R-Class keys are not in the
  // Euro NCAP table that `brandCandidateKey` serves.
  mercedesbenz: [
    [/^s\d/, 'sclass'],
    [/^v\d/, 'vclass'],
    [/^r\d/, 'rclass']
  ]
}

/**
 * Models the catalog files under a DIFFERENT make than the registry does, per registry make key:
 * [registry model key pattern, catalog make key]. The Renault Dokker is the Dacia Dokker (the catalog has no Renault
 * entry); Logan/Sandero/Duster have their own Renault catalog rows but RDW files them under Dacia, so the own make is tried first. Same rule as `MODEL_ALIASES`: only pairs verified in both the registry and the catalog.
 */
const CROSS_MAKE_ALIASES: Readonly<Record<string, readonly (readonly [RegExp, string])[]>> = {
  renault: [[/^(dokker|logan|sandero|duster)/, 'dacia']]
}

/** Catalog makes that file the ZAZ / Daewoo / Chevrolet Lanos lines (ZAZ Lanos, Daewoo Sens, Chevrolet Lanos …). */
const ZAZ_DAEWOO_CATALOG_MAKES = ['daewoo', 'zaz'] as const

/**
 * Model keys of the ZAZ / Daewoo family (`modelFamily`) a registry row belongs to: the family name ("lanos") and the name
 * with its canonical make glued on ("daewoolanos", how RDW spells it). Empty for every other row. Lets "ЗАЗ LANOS",
 * "CHEVROLET LANOS" and "ЗАЗ-DAEWOO T13110" reach the catalog row their sibling spelling already reaches.
 */
function zazDaewooFamilyKeys(mk: string, model: string): string[] {
  const found = modelFamily(mk, model)
  const name = modelKey(found?.family)
  if (!found || !name) return []
  return [name, `${found.brand === 'ZAZ' ? 'zaz' : 'daewoo'}${name}`]
}

/** Make keys whose catalog rows can hold this registry model: its own make first, then any curated cross-make home. */
export function vdbRelatedMakeKeys(mk: string, model: string): string[] {
  const collapsed = collapseDoubledModel(model).replace(/^new\s+(?=\S)/i, '')
  const key = modelKey(collapsed) ?? ''
  const extra = (CROSS_MAKE_ALIASES[mk] ?? []).filter(([pattern]) => pattern.test(key)).map(([, make]) => make)
  const family = zazDaewooFamilyKeys(mk, collapsed).length > 0 ? ZAZ_DAEWOO_CATALOG_MAKES : []
  return [...new Set([mk, ...extra, ...family])]
}

/** Lexus "RX 350" → "rx": the nameplate in front of a space-separated engine figure ("MX-5" is not "MX"). */
const SPACED_NAMEPLATE_RE = /^([a-z]{1,4})\s+\d/i

/**
 * Further model keys to retry when the direct one misses, most specific first: the make-specific series/class
 * key (BMW 320D → 3series, Mazda 3 → mazda3, Mercedes E 200 → eclass — `brandCandidateKey`), then the bare
 * nameplate before an engine figure (Lexus RX 350 → rx).
 */
export function vdbCandidateKeys(mk: string, model: string): { key: string; how: VdbMatchHow }[] {
  // "NEW SX4" is the same nameplate as "SX4"; the marketing prefix only gets in the way.
  const collapsed = collapseDoubledModel(model).replace(/^new\s+(?=\S)/i, '')
  const key = modelKey(collapsed)
  if (!key) return []
  const out: { key: string; how: VdbMatchHow }[] = [{ key, how: 'exact' }]
  for (const [pattern, alias] of MODEL_ALIASES[mk] ?? []) {
    if (pattern.test(key)) out.push({ key: alias, how: 'alias' })
  }
  const series = brandCandidateKey(mk, key)
  if (series && series !== key) out.push({ key: series, how: 'series' })
  const letters = SPACED_NAMEPLATE_RE.exec(collapsed)?.[1]?.toLowerCase()
  if (letters && letters !== key && letters !== series) out.push({ key: letters, how: 'prefix' })
  for (const familyKey of zazDaewooFamilyKeys(mk, collapsed)) {
    if (!out.some(c => c.key === familyKey)) out.push({ key: familyKey, how: 'alias' })
  }
  return out
}

/** Preferred row among equals: car-like kind, then the closest (shortest) key, then the most popular decile. */
function best<T extends ModelReferenceRow>(rows: readonly T[], kinds?: readonly string[]): T {
  return [...rows].sort(
    (a, b) =>
      kindRank(a.kind, kinds) - kindRank(b.kind, kinds) ||
      a.modelKey.length - b.modelKey.length ||
      (a.globalDecile ?? 99) - (b.globalDecile ?? 99)
  )[0]!
}

/**
 * Finds the catalog row for a registry (make, model). `makeRows` must already be one make (filter on
 * `makeKey`); `mk` is that make key. Order: exact key → alias key → series/nameplate keys (BMW, Mazda,
 * Mercedes, Lexus …) → catalog keys that START WITH the registry key ("Octavia" for "OCTAVIA A5") →
 * the longest catalog key that is a prefix of the registry key ("LAND CRUISER 200" → "landcruiser").
 * `kinds` (see `vdbCatalogKinds`) restricts the catalog rows to those kinds and ranks them in that order.
 * Null when nothing fits — callers must hide the data then, never guess.
 */
export function matchVdbModel<T extends ModelReferenceRow>(
  allMakeRows: readonly T[],
  mk: string,
  model: string,
  kinds?: readonly string[]
): VdbMatch<T> | null {
  const makeRows = kinds ? allMakeRows.filter(r => kinds.includes(r.kind)) : allMakeRows
  const candidates = vdbCandidateKeys(mk, model)
  if (candidates.length === 0) return null

  for (const { key, how } of candidates) {
    const exact = makeRows.filter(r => r.modelKey === key)
    if (exact.length > 0) return { row: best(exact, kinds), how }
    const alias = makeRows.filter(r => r.aliases.some(a => modelKey(a) === key))
    if (alias.length > 0) return { row: best(alias, kinds), how: how === 'exact' ? 'alias' : how }
  }

  const direct = candidates[0]!.key
  if (direct.length >= MIN_PREFIX_KEY_LENGTH) {
    const forward = makeRows.filter(r => r.modelKey.startsWith(direct))
    if (forward.length > 0) return { row: best(forward, kinds), how: 'prefix' }
  }
  // A catalog key like "accord2" must not swallow "accord20" (Accord 2.0): when it is a name ending in a digit, the
  // registry key may only continue with a non-digit.
  const continuesNumber = (key: string): boolean =>
    /[a-z]/.test(key) && /\d$/.test(key) && /^\d/.test(direct.slice(key.length))
  const reverse = makeRows.filter(
    r => r.modelKey.length >= MIN_PREFIX_KEY_LENGTH && direct.startsWith(r.modelKey) && !continuesNumber(r.modelKey)
  )
  if (reverse.length === 0) return null
  const longest = Math.max(...reverse.map(r => r.modelKey.length))
  return {
    row: best(
      reverse.filter(r => r.modelKey.length === longest),
      kinds
    ),
    how: 'prefix'
  }
}

/**
 * `matchVdbModel` over catalog rows of several makes: tries the registry make first, then each curated cross-make home
 * (`vdbRelatedMakeKeys`). `rows` may hold any makes — load at least the related ones. The one code path for the API
 * and the stats script.
 */
export function matchVdbModelAcrossMakes<T extends ModelReferenceRow>(
  rows: readonly T[],
  mk: string,
  model: string,
  kinds?: readonly string[]
): VdbMatch<T> | null {
  for (const key of vdbRelatedMakeKeys(mk, model)) {
    const found = matchVdbModel(
      rows.filter(r => r.makeKey === key),
      key,
      model,
      kinds
    )
    if (found) return found
  }
  return null
}

/** Latin-script aliases that differ from the model name itself ("ID3" is just "ID.3"; the catalog also lists Japanese names). */
export function displayAliases(aliases: readonly string[], modelName: string): string[] {
  const own = modelKey(modelName)
  return aliases.filter(a => /[a-z]/i.test(a) && modelKey(a) !== own)
}

/** True when the model is sold in Ukraine's own register but in no other country — a UA-only nameplate. */
export function isUkraineOnly(row: Pick<VdbReferenceRow, 'countries'>): boolean {
  return row.countries.length > 0 && row.countries.every(c => c === 'ua')
}

/** Markets other than Ukraine the model appears in (the "also sold in" list), as stored: lowercase ISO codes. */
export function otherMarkets(row: Pick<VdbReferenceRow, 'countries'>): string[] {
  return row.countries.filter(c => c !== 'ua')
}
