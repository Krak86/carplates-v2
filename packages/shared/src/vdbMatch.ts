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
  gaz: [
    [/^31(02|05|10|29)/, 'volga'],
    // GAZ-24-10 / 24-02 are the Volga 24 sedan/estate (the catalog has "24" and "2401" only).
    [/^24(02|10)/, '24'],
    // Gazelle: 3302/33021/33023 (flatbed, van), 2705 (van), 3221/32213 (minibus); Sobol: 2217, 2752.
    [/^(3302|2705|3221)/, 'gazelle'],
    [/^(2217|2752)/, 'sobol'],
    // GAZ-3309 is the diesel-engined 3307 (same cab and chassis family; the article is "GAZ-3307").
    [/^330[79]/, '3307']
  ],
  // The registry drops the Cyrillic "А" of Bogdan / BAZ indexes (А-09202 → 09202, А079.14 → 07914). The Bogdan A092 is the
  // Ataman A092 bus; A091 and the BAZ А079 (Etalon) have articles under the Latin letter.
  bogdan: [
    [/^092/, 'a092'],
    [/^091/, 'a091']
  ],
  baz: [[/^079/, 'a079']],
  // PAZ-32054 / 32051 / 32053 are modifications of the PAZ-3205 bus.
  paz: [[/^3205/, '3205']],
  // VAZ type-approval numbers are model + modification digit: 2110x (21101, 21104 …) is the 2110 sedan, 2111x the 2111
  // estate, 2112x the 2112 hatch; 2113–2115x are the Samara-2 line the catalog files under "Samara". A sixth digit
  // (211540, 211010) is a suffix on the same code. Priora: the catalog holds only the 2172 hatch, 2170/2171 share its nameplate.
  lada: [
    [/^2110/, '110'],
    [/^2111/, '111'],
    [/^2112/, '112'],
    [/^211[345]/, 'samara'],
    [/^217[01]/, '2172'],
    // The generation catalogue (Wikipedia) names these lines, not the codes: Priora 2170–2172, Kalina 1117–1119, Niva 2121/2131.
    [/^2113/, '2114'],
    [/^2102/, '2101'],
    [/^217[012]/, 'priora'],
    [/^111[789]/, 'kalina'],
    [/^21(21|31)/, 'niva']
  ],
  // UAZ-3151x (31512 …) is the renamed 469; the 452 "Bukhanka" family (3303 flatbed, 3741 van, 3962 ambulance, 2206 bus).
  uaz: [
    [/^3151/, '469'],
    [/^(3303|3741|3962|2206)/, '452']
  ],
  // ZAZ-1102 is the Tavria, 1103 the Slavuta, 1105 the Dana (Tavria pickup).
  zaz: [
    [/^1102/, 'tavria'],
    [/^1103/, 'slavuta'],
    [/^1105/, 'dana']
  ],
  // The ZAZ Vida is the Chevrolet Aveo T250 (reached through `CROSS_MAKE_ALIASES`).
  chevrolet: [[/^vida/, 'aveo']],
  // "PRADO" is the bare nameplate of the Land Cruiser Prado.
  toyota: [[/^prado/, 'landcruiserprado']],
  // Body-variant words after the nameplate: the catalog files them under the base model.
  renault: [[/^grandscenic/, 'scenic']],
  audi: [
    [/^a4avant/, 'a4'],
    [/^a6allroad/, 'a6']
  ],
  volkswagen: [
    [/^ccsport/, 'cc'],
    // LT 28 / 35 / 46 are the weight classes of the LT.
    [/^lt\d/, 'lt']
  ],
  // Daily codes are weight class + power (35C13, 35S13, 35.10, 50C15) or the "Turbo Daily" name.
  iveco: [[/^(turbodaily|\d{2}[cs]?\d{2}$)/, 'daily']],
  // The Renault Taliant is the Turkish-market Dacia Logan III (reached through `CROSS_MAKE_ALIASES`).
  dacia: [[/^taliant/, 'logan']],
  // Registry spells the class as letter + engine figure (S 500); the catalog's S/V/R-Class keys are not in the
  // Euro NCAP table that `brandCandidateKey` serves.
  // Bus-registered vans: bare Sprinter codes (313 CDI, 312 D, 316; a Cyrillic variant suffix is dropped, 312Д-П18 → 31218; the ranges skip the cars: 250 D, 300 D, 500),
  // the T2 (609 D, 814) and the Citaro (O 530). Ranges avoid the cars (200 D–250 D, 300 D, 500, 600). Pre-1995 T1 codes (208 D–410 D) fall outside the Sprinter's years, so the chip hides.
  mercedesbenz: [
    [/^(2(0[89]|1\d)|[345](0[1-9]|1\d))(cdi|d)?(\d\d)?$/, 'sprinter'],
    [/^(60\d|61\d|70\d|81\d)d?$/, 't2'],
    [/^o530/, 'citaro'],
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
  renault: [[/^(dokker|logan|sandero|duster|taliant)/, 'dacia']],
  // Bogdan assembled the VAZ 2110 / 2111 / 2112 / 2115 / Priora under its own badge.
  bogdan: [[/^(211[0-5]|217[01])/, 'lada']],
  zaz: [[/^vida/, 'chevrolet']]
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

/** "NEW SX4" / "NUOVO DOBLO" is the same nameplate as "SX4" / "DOBLO"; the marketing prefix only gets in the way. */
const MARKETING_PREFIX_RE = /^(new|nuovo)\s+(?=\S)/i

/** Registry engine figure after the nameplate ("A4 1.8", "6 2.5"). */
const ENGINE_SIZE_RE = /\s+\d\.\d.*$/

/** Make keys whose catalog rows can hold this registry model: its own make first, then any curated cross-make home. */
export function vdbRelatedMakeKeys(mk: string, model: string): string[] {
  const collapsed = collapseDoubledModel(model).replace(MARKETING_PREFIX_RE, '')
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
 * nameplate before an engine figure (Lexus RX 350 → rx; "A4 1.8" → a4, "6 2.5" → mazda6).
 */
export function vdbCandidateKeys(mk: string, model: string): { key: string; how: VdbMatchHow }[] {
  const collapsed = collapseDoubledModel(model).replace(MARKETING_PREFIX_RE, '')
  const key = modelKey(collapsed)
  if (!key) return []
  const out: { key: string; how: VdbMatchHow }[] = [{ key, how: 'exact' }]
  const push = (candidate: string | null | undefined, how: VdbMatchHow): void => {
    if (candidate && !out.some(c => c.key === candidate)) out.push({ key: candidate, how })
  }
  for (const [pattern, alias] of MODEL_ALIASES[mk] ?? []) {
    if (pattern.test(key)) push(alias, 'alias')
  }
  const series = brandCandidateKey(mk, key)
  if (series !== key) push(series, 'series')
  const letters = SPACED_NAMEPLATE_RE.exec(collapsed)?.[1]?.toLowerCase()
  if (letters && letters !== key) push(letters, 'prefix')
  const base = modelKey(collapsed.replace(ENGINE_SIZE_RE, ''))
  if (base && base !== key) {
    push(base, 'prefix')
    push(brandCandidateKey(mk, base), 'series')
  }
  for (const familyKey of zazDaewooFamilyKeys(mk, collapsed)) push(familyKey, 'alias')
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

/** Makes sold under another badge elsewhere (UK: Opel → Vauxhall): registry make key → the other make's display name. */
export const MARKET_MAKE_SYNONYMS: Readonly<Record<string, string>> = { opel: 'Vauxhall', vauxhall: 'Opel' }

/** "Vauxhall Astra" for an Opel Astra: the same car under its other-market make, `[]` for makes without one. */
export function makeSynonymAliases(mk: string, modelName: string): string[] {
  const make = MARKET_MAKE_SYNONYMS[mk]
  return make ? [`${make} ${modelName}`] : []
}

/** True when the model is sold in Ukraine's own register but in no other country — a UA-only nameplate. */
export function isUkraineOnly(row: Pick<VdbReferenceRow, 'countries'>): boolean {
  return row.countries.length > 0 && row.countries.every(c => c === 'ua')
}

/** Markets other than Ukraine the model appears in (the "also sold in" list), as stored: lowercase ISO codes. */
export function otherMarkets(row: Pick<VdbReferenceRow, 'countries'>): string[] {
  return row.countries.filter(c => c !== 'ua')
}
