/**
 * Stage K ingest, pure part: the Wikipedia edition chain per make and the merge of the parsed editions of one generation
 * into one `model_spec_wiki` row. Each block (dimensions, engines, drive) comes from ONE edition, so the label shown next
 * to it ("Wikipedia (RU)") is true for every figure in it.
 */
import type { ModelSpecWikiInsert, WikiEngineJson } from '@carplates/db'
import type { WikiSpecs } from '@carplates/shared'

/** Home-market Wikipedia edition(s) per make key; they only add to the base chain, never replace it. */
export const HOME_WIKI_LANGS: Record<string, string[]> = {
  toyota: ['ja'],
  honda: ['ja'],
  nissan: ['ja'],
  mazda: ['ja'],
  mitsubishi: ['ja'],
  subaru: ['ja'],
  suzuki: ['ja'],
  lexus: ['ja'],
  hyundai: ['ko'],
  kia: ['ko'],
  genesis: ['ko'],
  volkswagen: ['de'],
  bmw: ['de'],
  audi: ['de'],
  opel: ['de'],
  mercedes: ['de'],
  skoda: ['cs'],
  renault: ['fr'],
  peugeot: ['fr'],
  citroen: ['fr'],
  fiat: ['it']
}

/** en first (the best-structured infoboxes), then ru / uk (second-best, nested per-generation blocks), de (engine tables for every make), then home. */
export const BASE_WIKI_LANGS = ['en', 'ru', 'uk', 'de'] as const

export const wikiLangChain = (makeKey: string): string[] => [
  ...new Set([...BASE_WIKI_LANGS, ...(HOME_WIKI_LANGS[makeKey] ?? [])])
]

export type Edition = { lang: string; title: string; revid: number | null; specs: WikiSpecs }

const MAX_ENGINES = 40
const RAW_MAX = 160

const dimCount = (s: WikiSpecs): number =>
  [s.wheelbaseMm, s.lengthMm, s.widthMm, s.heightMm, s.kerbKg, s.fuelTankL].filter(m => m !== null).length

const hasPower = (s: WikiSpecs): boolean => s.engines.some(e => e.powerKw !== null)

/** First edition of the chain with the highest count (an earlier edition wins a tie). */
function best(editions: Edition[], score: (s: WikiSpecs) => number): Edition | undefined {
  let pick: Edition | undefined
  let top = 0
  for (const e of editions) {
    const n = score(e.specs)
    if (n > top) {
      top = n
      pick = e
    }
  }
  return pick
}

const engineJson = (e: WikiSpecs['engines'][number]): WikiEngineJson => ({
  displacementCc: e.displacementCc,
  cylinders: e.cylinders,
  powerKw: e.powerKw,
  fuel: e.fuel,
  raw: e.raw.slice(0, RAW_MAX),
  ...(e.powerKwMax != null ? { powerKwMax: e.powerKwMax } : {}),
  ...(e.chassisCodes?.length ? { chassisCodes: e.chassisCodes } : {}),
  // Kept even when empty: its presence says the header named the column, so the reader skips the shape guess.
  ...(e.engineCodes ? { engineCodes: e.engineCodes } : {}),
  ...(e.note ? { note: e.note } : {}),
  ...(e.years ? { years: e.years } : {})
})

const whole = (m: WikiSpecs['lengthMm']): number | null => (m ? Math.round(m.value) : null)

/**
 * One row from the editions of a generation (in chain order), or null when no edition has anything.
 * `rdwHasModel` = RDW has measured rows for the make/model: the dimension block is dropped (never show both).
 */
export function mergeEditions(
  key: { makeKey: string; modelKey: string; yearFrom: number; wikidataId: string },
  editions: Edition[],
  rdwHasModel: boolean
): ModelSpecWikiInsert | null {
  const dims = rdwHasModel ? undefined : best(editions, dimCount)
  // An engine list is only worth showing with power; a list without it is a fallback when no edition has any.
  const engines = best(editions, s => (hasPower(s) ? s.engines.length : 0)) ?? best(editions, s => s.engines.length)
  const drive = best(editions, s => (s.layout ? 1 : 0) + (s.transmission ? 1 : 0))
  if (!dims && !engines && !drive) return null

  const d = dims?.specs
  return {
    ...key,
    wheelbaseMm: d ? whole(d.wheelbaseMm) : null,
    lengthMm: d ? whole(d.lengthMm) : null,
    widthMm: d ? whole(d.widthMm) : null,
    heightMm: d ? whole(d.heightMm) : null,
    kerbKg: d ? whole(d.kerbKg) : null,
    fuelTankL: d?.fuelTankL ? Math.round(d.fuelTankL.value * 10) / 10 : null,
    layout: drive?.specs.layout ?? '',
    transmission: drive?.specs.transmission ?? '',
    engines: engines ? engines.specs.engines.slice(0, MAX_ENGINES).map(engineJson) : [],
    srcLang: dims?.lang ?? '',
    srcTitle: dims?.title ?? '',
    revid: dims?.revid ?? null,
    enginesLang: engines?.lang ?? '',
    enginesTitle: engines?.title ?? '',
    driveLang: drive?.lang ?? '',
    driveTitle: drive?.title ?? ''
  }
}
