/**
 * Pure helpers of `ingest:brand-origin`: matching Wikidata labels to our brand slugs, reading SPARQL bindings, merging the items of one
 * brand into `brand_origin_period` / `brand_ownership` rows. No network, no DB.
 */
import { z } from 'zod'

/** Wikidata classes that hold car / truck / bus / motorcycle makers and brands (direct P31 only: P279* times out). */
export const BRAND_CLASSES = [
  'Q786820', // automobile manufacturer
  'Q10429667', // car brand
  'Q108460239', // truck manufacturer
  'Q4380190', // bus manufacturer
  'Q15081030' // motorcycle manufacturer
] as const

const binding = z.object({ value: z.string() })

export const sparqlResponseSchema = z.object({
  results: z.object({ bindings: z.array(z.record(z.string(), binding)) })
})
export type SparqlRow = Record<string, { value: string }>

export const qid = (uri: string): string => uri.slice(uri.lastIndexOf('/') + 1)

/** "Škoda" -> "skoda", "Mercedes-Benz" -> "mercedes-benz", "Land Rover" -> "land-rover" (the `brandSlug` scheme). */
export function labelToSlug(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Company suffixes dropped for the second matching tier ("Škoda Auto" -> "skoda", "Volvo Cars" -> "volvo"). */
const COMPANY_SUFFIX =
  /-(auto|automobil|automobile|automobiles|automobili|cars|car|motor|motors|motor-company|motor-corporation|motor-cars|motorcycles|company|co|ltd|limited|inc|corporation|gmbh|ag|sa|spa|nv|plc|trucks|bus|buses)$/

export function labelToLooseSlug(label: string): string {
  let slug = labelToSlug(label)
  for (let i = 0; i < 3; i++) {
    const next = slug.replace(COMPANY_SUFFIX, '')
    if (next === slug || next === '') break
    slug = next
  }
  return slug
}

export type WikidataItem = { id: string; labels: string[] }

export type SlugMatches = {
  /** slug -> item ids whose label is exactly the slug; scalar facts (country, founded, HQ) prefer these. */
  exact: Map<string, string[]>
  /** slug -> item ids that match only after dropping a company suffix; used for ownership and as a scalar fallback. */
  loose: Map<string, string[]>
}

/** `aliases` maps a slug to extra Wikidata ids (hand-picked) that always count as exact. */
export function matchSlugs(
  items: readonly WikidataItem[],
  slugs: ReadonlySet<string>,
  aliases: Readonly<Record<string, readonly string[]>> = {}
): SlugMatches {
  const exact = new Map<string, string[]>()
  const loose = new Map<string, string[]>()
  const push = (m: Map<string, string[]>, slug: string, id: string): void => {
    const list = m.get(slug) ?? []
    if (!list.includes(id)) list.push(id)
    m.set(slug, list)
  }
  for (const item of items) {
    for (const label of item.labels) {
      const full = labelToSlug(label)
      if (slugs.has(full)) {
        push(exact, full, item.id)
        continue
      }
      const short = labelToLooseSlug(label)
      if (short !== full && slugs.has(short)) push(loose, short, item.id)
    }
  }
  for (const [slug, ids] of Object.entries(aliases)) for (const id of ids) push(exact, slug, id)
  return { exact, loose }
}

export type ItemFacts = {
  id: string
  countryCode: string | null
  /** P17 (country) as a fallback for items without P495 (country of origin). */
  homeCountryCode: string | null
  foundedYear: number | null
  hqCity: string | null
  owners: { ownerName: string; ownerCountry: string | null; fromYear: number; toYear: number | null; parent: boolean }[]
}

const yearOf = (iso: string | undefined): number | null => {
  const m = /^(-?\d{4})/.exec(iso ?? '')
  const y = m ? Number(m[1]) : NaN
  return Number.isFinite(y) && y > 0 ? y : null
}

/** Folds the flat SPARQL rows (one per country x inception x HQ x owner combination) of the detail query into one fact set per item. */
export function foldItemRows(rows: readonly SparqlRow[]): Map<string, ItemFacts> {
  const byId = new Map<string, ItemFacts>()
  for (const row of rows) {
    const id = qid(row.item?.value ?? '')
    if (!id) continue
    const facts = byId.get(id) ?? {
      id,
      countryCode: null,
      homeCountryCode: null,
      foundedYear: null,
      hqCity: null,
      owners: []
    }
    byId.set(id, facts)
    const cc = row.cc?.value
    if (cc && !facts.countryCode && /^[A-Z]{2}$/.test(cc)) facts.countryCode = cc
    const home = row.ccHome?.value
    if (home && !facts.homeCountryCode && /^[A-Z]{2}$/.test(home)) facts.homeCountryCode = home
    const founded = yearOf(row.inception?.value)
    if (founded && (!facts.foundedYear || founded < facts.foundedYear)) facts.foundedYear = founded
    if (row.hq?.value && !facts.hqCity && !/^Q\d+$/.test(row.hq.value)) facts.hqCity = row.hq.value
    const ownerName = row.owner?.value
    if (ownerName && !/^Q\d+$/.test(ownerName)) {
      const fromYear = yearOf(row.ownerFrom?.value) ?? 0
      const toYear = yearOf(row.ownerTo?.value)
      const ownerCountry = /^[A-Z]{2}$/.test(row.ownerCc?.value ?? '') ? (row.ownerCc?.value ?? null) : null
      const parent = row.ownerKind?.value === 'parent'
      const dup = facts.owners.find(o => o.ownerName === ownerName && o.fromYear === fromYear)
      if (dup) {
        dup.toYear ??= toYear
        dup.parent ||= parent
      } else facts.owners.push({ ownerName, ownerCountry, fromYear, toYear, parent })
    }
  }
  return byId
}

export type BrandOriginRow = {
  brandSlug: string
  fromYear: number
  toYear: number | null
  countryCode: string
  foundedYear: number | null
  hqCity: string | null
  source: string
}
export type BrandOwnershipRowOut = {
  brandSlug: string
  ownerName: string
  ownerCountry: string | null
  fromYear: number
  toYear: number | null
  source: string
}

const wikidataUrl = (id: string): string => `https://www.wikidata.org/wiki/${id}`

export type MergedBrand = { origin: BrandOriginRow | null; owners: BrandOwnershipRowOut[] }

/** One brand from all its matched items: the first exact item with a value wins each scalar, ownership is the union of all items. */
export function mergeBrand(
  slug: string,
  exactIds: readonly string[],
  looseIds: readonly string[],
  facts: ReadonlyMap<string, ItemFacts>
): MergedBrand {
  const ordered = [...exactIds, ...looseIds.filter(id => !exactIds.includes(id))]
    .map(id => facts.get(id))
    .filter((f): f is ItemFacts => !!f)
  const first = <T>(pick: (f: ItemFacts) => T | null): { value: T; id: string } | null => {
    for (const f of ordered) {
      const value = pick(f)
      if (value != null) return { value, id: f.id }
    }
    return null
  }
  const country = first(f => f.countryCode) ?? first(f => f.homeCountryCode)
  const founded = first(f => f.foundedYear)
  const hq = first(f => f.hqCity)
  const origin: BrandOriginRow | null = country
    ? {
        brandSlug: slug,
        fromYear: 0,
        toYear: null,
        countryCode: country.value,
        foundedYear: founded?.value ?? null,
        hqCity: hq?.value ?? null,
        source: wikidataUrl(country.id)
      }
    : null

  const owners: BrandOwnershipRowOut[] = []
  for (const f of ordered) {
    for (const o of f.owners) {
      // Same owner and start year from two items: keep one, prefer the one that knows the end.
      const dup = owners.find(x => x.ownerName === o.ownerName && x.fromYear === o.fromYear)
      if (dup) {
        dup.toYear ??= o.toYear
        dup.ownerCountry ??= o.ownerCountry
        continue
      }
      // An undated plain "owned by" is usually a shareholder (Nippon Life -> Toyota): only parents and dated owners are history.
      if (!o.parent && o.fromYear === 0) continue
      owners.push({
        brandSlug: slug,
        ownerName: o.ownerName,
        ownerCountry: o.ownerCountry,
        fromYear: o.fromYear,
        toYear: o.toYear,
        source: wikidataUrl(f.id)
      })
    }
  }
  owners.sort((a, b) => a.fromYear - b.fromYear || a.ownerName.localeCompare(b.ownerName))
  return { origin, owners }
}

const snakSchema = z.object({ datavalue: z.object({ value: z.unknown() }).optional() })
const statementSchema = z.object({
  rank: z.string().optional(),
  mainsnak: snakSchema,
  qualifiers: z.record(z.string(), z.array(snakSchema)).optional()
})
export const entitiesSchema = z.object({
  entities: z.record(
    z.string(),
    z.object({
      claims: z.record(z.string(), z.array(statementSchema)).optional(),
      labels: z.record(z.string(), z.object({ value: z.string() })).optional()
    })
  )
})
/** Wikidata values differ per property (string, entity, time ...): read the one field a caller needs, defensively. */
const field = (value: unknown, key: 'id' | 'time'): string | undefined => {
  const v = (value as Record<string, unknown> | null | undefined)?.[key]
  return typeof v === 'string' ? v : undefined
}

export type Entities = z.infer<typeof entitiesSchema>['entities']

/** "Owned by" (P127) and "parent organization" (P749) statements of the items, as the SPARQL-row shape `foldItemRows` reads. */
export function ownerIdsOf(entities: Entities): string[] {
  const ids = new Set<string>()
  for (const e of Object.values(entities)) {
    for (const prop of ['P127', 'P749']) {
      for (const st of e.claims?.[prop] ?? []) {
        const id = field(st.mainsnak.datavalue?.value, 'id')
        if (id && st.rank !== 'deprecated') ids.add(id)
      }
    }
  }
  return [...ids]
}

export function ownerRows(entities: Entities, ownerLabels: ReadonlyMap<string, string>): SparqlRow[] {
  const rows: SparqlRow[] = []
  for (const [item, e] of Object.entries(entities)) {
    for (const [prop, kind] of [
      ['P127', 'owner'],
      ['P749', 'parent']
    ] as const) {
      for (const st of e.claims?.[prop] ?? []) {
        const id = field(st.mainsnak.datavalue?.value, 'id')
        const name = id ? ownerLabels.get(id) : undefined
        if (!id || !name || st.rank === 'deprecated') continue
        const row: SparqlRow = {
          item: { value: `http://www.wikidata.org/entity/${item}` },
          owner: { value: name },
          ownerKind: { value: kind }
        }
        const from = field(st.qualifiers?.P580?.[0]?.datavalue?.value, 'time')
        const to = field(st.qualifiers?.P582?.[0]?.datavalue?.value, 'time')
        if (from) row.ownerFrom = { value: from.replace(/^\+/, '') }
        if (to) row.ownerTo = { value: to.replace(/^\+/, '') }
        rows.push(row)
      }
    }
  }
  return rows
}
