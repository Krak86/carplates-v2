/**
 * Pure assembly of `registry.brand_pronunciation` rows from the parsed Wikipedia leads and the hand-written overrides CSV
 * (`brand-pronounce-overrides.csv`). One row per site language (ua / ru / en); an override replaces a cell, never the whole row.
 */
import { z } from 'zod'

import type { Lead, Wiki } from './brand-pronounce-parse.js'

export const SITE_LANGS = ['ua', 'ru', 'en'] as const
export type SiteLang = (typeof SITE_LANGS)[number]

/** Site language -> the Wikipedia whose lead feeds its respelling / IPA. */
const WIKI_OF: Record<SiteLang, Wiki> = { ua: 'uk', ru: 'ru', en: 'en' }

export type LeadInput = { lead: Lead; revid: number | null }
export type PronunciationRow = {
  brandSlug: string
  lang: SiteLang
  ipa: string | null
  ipaLang: string | null
  respell: string | null
  source: string
  rev: number | null
}

const overrideRowSchema = z.object({
  brand_slug: z.string().min(1),
  lang: z.enum(SITE_LANGS),
  ipa: z.string().optional().default(''),
  ipa_lang: z.string().optional().default(''),
  respell: z.string().optional().default('')
})
export type Override = { ipa: string | null; ipaLang: string | null; respell: string | null }
export type Overrides = Map<string, Override>

/** `brandSlug|lang` key of an override. */
export const overrideKey = (brandSlug: string, lang: SiteLang): string => `${brandSlug}|${lang}`

/**
 * Parses `brand-pronounce-overrides.csv`: `brand_slug,lang,ipa,ipa_lang,respell`; `#` lines and blanks skipped; the first
 * remaining line is the header; fields containing a comma are double-quoted. An empty cell means "keep Wikipedia's".
 */
export function parseOverrides(csv: string): Overrides {
  const lines = csv.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'))
  const [header = '', ...body] = lines
  const cols = splitCsvLine(header)
  const out: Overrides = new Map()
  for (const line of body) {
    const cells = splitCsvLine(line)
    const parsed = overrideRowSchema.safeParse(Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? '').trim()])))
    if (!parsed.success) throw new Error(`brand-pronounce-overrides.csv: bad row "${line}"`)
    const r = parsed.data
    out.set(overrideKey(r.brand_slug, r.lang), {
      ipa: r.ipa || null,
      ipaLang: r.ipa_lang || null,
      respell: r.respell || null
    })
  }
  return out
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

/**
 * The three rows of one make. IPA: the language's own lead first; the English row prefers the English reading (`{{IPAc-en}}`),
 * every row falls back to the native-language IPA of the en lead (`ipaLang` says which). Respelling only from the language's own
 * lead. `source` / `rev` point at the Wikipedia that supplied the respelling, else the IPA. Rows with nothing are dropped.
 */
export function buildRows(
  brandSlug: string,
  leads: Partial<Record<Wiki, LeadInput>>,
  overrides: Overrides = new Map()
): PronunciationRow[] {
  const native = leads.en?.lead.ipa
    ? { ipa: leads.en.lead.ipa, ipaLang: leads.en.lead.ipaLang, from: 'en' as Wiki }
    : null
  const rows: PronunciationRow[] = []
  for (const lang of SITE_LANGS) {
    const wiki = WIKI_OF[lang]
    const own = leads[wiki]
    const l = own?.lead
    let ipa: string | null = null
    let ipaLang: string | null = null
    let ipaFrom: Wiki | null = null
    const english = lang === 'en' ? (l?.enIpa.uk ?? l?.enIpa.us ?? null) : null
    if (english) [ipa, ipaLang, ipaFrom] = [english, 'en', wiki]
    else if (l?.ipa) [ipa, ipaLang, ipaFrom] = [l.ipa, l.ipaLang, wiki]
    else if (native) [ipa, ipaLang, ipaFrom] = [native.ipa, native.ipaLang, native.from]
    let respell = l?.respell ?? null
    let source = respell ? `wikipedia:${wiki}` : ipaFrom ? `wikipedia:${ipaFrom}` : ''
    let rev = respell ? (own?.revid ?? null) : ipaFrom ? (leads[ipaFrom]?.revid ?? null) : null

    const o = overrides.get(overrideKey(brandSlug, lang))
    if (o) {
      if (o.ipa) [ipa, ipaLang] = [o.ipa, o.ipaLang]
      if (o.respell) respell = o.respell
      if (o.ipa || o.respell) [source, rev] = ['override', null]
    }
    if (ipa || respell) rows.push({ brandSlug, lang, ipa, ipaLang, respell, source, rev })
  }
  return rows
}
