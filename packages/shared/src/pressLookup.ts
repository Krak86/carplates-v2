import { modelSlugCandidates } from './infocarLookup.js'

/**
 * Picks tech-press test drives (`registry.press_reviews`, see scripts/src/press.ts — itc.ua, mezha.ua) for a registry
 * (brand, model, year). Pure over the rows it is given. These sites have no structured make/model, so both are found in
 * free text: the brand when ingesting (`findBrandSlug`), the model at lookup — any of infocar's model-slug candidates
 * (`CR-V` -> `crv`) must appear in an article's titles/tags as a run of up to `MAX_WINDOW` tokens (`cr`+`v`).
 * An article is tied to a year only loosely (a model year named in a title, else its publication year): rows are ranked
 * by distance to the car's year and ones more than `MAX_YEAR_GAP` years away are dropped.
 */
export const PRESS_LANGS = ['uk', 'ru', 'en'] as const
export type PressLang = (typeof PRESS_LANGS)[number]

export type PressLangEntry = { url: string; title: string; blurb: string | null }

export type PressLookupRow = {
  url: string
  source: string
  brandSlug: string | null
  keywords: string
  yearHint: number | null
  /** `YYYY-MM-DD`. */
  publishedAt: string | null
  langs: Partial<Record<PressLang, PressLangEntry>>
}

export const MAX_PRESS_REVIEWS = 6
const MAX_WINDOW = 4
const MAX_YEAR_GAP = 10

/** Brand spellings the outlets use that differ from the catalog's slug. */
const BRAND_ALIASES: Record<string, string> = { vw: 'volkswagen', 'mercedes-benz': 'mercedes', chevy: 'chevrolet' }

/** Lowercase alphanumeric tokens, diacritics dropped, split at letter/digit boundaries (`Mazda6` -> `mazda`, `6`). */
export function pressTokens(text: string): string[] {
  return text
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/(\p{L})(\p{N})/gu, '$1 $2')
    .replace(/(\p{N})(\p{L})/gu, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

export const squash = (s: string): string => pressTokens(s).join('')

/** First (earliest, then longest) catalog brand slug named in any of `texts`, tried in order; `null` when none. */
export function findBrandSlug(texts: string[], brandSlugs: string[]): string | null {
  const brands = [
    ...brandSlugs.map(slug => ({ slug, tokens: pressTokens(slug) })),
    ...Object.entries(BRAND_ALIASES).flatMap(([alias, slug]) =>
      brandSlugs.includes(slug) ? [{ slug, tokens: pressTokens(alias) }] : []
    )
  ].filter(b => b.tokens.length)
  for (const text of texts) {
    const words = pressTokens(text)
    for (let i = 0; i < words.length; i++) {
      const hits = brands.filter(b => b.tokens.every((tok, k) => words[i + k] === tok))
      if (hits.length) return hits.sort((a, b) => b.tokens.length - a.tokens.length)[0]!.slug
    }
  }
  return null
}

/** A model year (1990-2039) named in a title, else `null`. */
export function titleYear(text: string): number | null {
  const m = /(?<![\d.])((?:199|20[0-3])\d)(?![\d.])/.exec(text)
  return m ? Number(m[1]) : null
}

/** Does any run of ≤ `MAX_WINDOW` tokens in `words` spell `candidate` (squashed)? Very short candidates must follow the brand. */
export function namesModel(words: string[], candidate: string, brandTokens: string[]): boolean {
  for (let i = 0; i < words.length; i++) {
    let joined = ''
    for (let j = i; j < Math.min(words.length, i + MAX_WINDOW); j++) {
      joined += words[j]
      if (joined.length > candidate.length) break
      if (joined !== candidate) continue
      if (candidate.length > 2) return true
      const before = words.slice(Math.max(0, i - brandTokens.length), i)
      if (brandTokens.length && before.join() === brandTokens.join()) return true
    }
  }
  return false
}

const anchorYear = (r: PressLookupRow): number | null =>
  r.yearHint ?? (r.publishedAt ? Number(r.publishedAt.slice(0, 4)) : null)

export function pressLookup(
  rows: PressLookupRow[],
  brandSlug: string | null,
  model: string | null | undefined,
  year: number | null | undefined,
  catalogSlugs: string[]
): PressLookupRow[] {
  if (!brandSlug || !model?.trim()) return []
  const brandRows = rows.filter(r => r.brandSlug === brandSlug)
  if (!brandRows.length) return []
  const brandTokens = pressTokens(brandSlug)
  const wordsOf = new Map(
    brandRows.map(r => [r.url, pressTokens([r.keywords, ...Object.values(r.langs).map(l => l?.title ?? '')].join(' '))])
  )
  const gap = (r: PressLookupRow): number => {
    const anchor = anchorYear(r)
    return year == null || anchor == null ? 0 : Math.abs(anchor - year)
  }

  // The first candidate that matches any article wins (candidates run most specific first).
  for (const candidate of modelSlugCandidates(brandSlug, model, catalogSlugs)) {
    const squashed = squash(candidate)
    if (!squashed) continue
    const hits = brandRows.filter(r => namesModel(wordsOf.get(r.url) ?? [], squashed, brandTokens))
    if (!hits.length) continue
    return hits
      .filter(r => gap(r) <= MAX_YEAR_GAP)
      .sort((a, b) => gap(a) - gap(b) || (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
      .slice(0, MAX_PRESS_REVIEWS)
  }
  return []
}
