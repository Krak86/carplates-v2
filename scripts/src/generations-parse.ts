/**
 * Pure parsing for the car-generations ingest (`generations.ts`): Wikipedia wikitext (infobox fields, section headings,
 * article titles) → generation rows. No network, no DB. Facts only (years, codes, body styles) — Wikipedia text is CC BY-SA.
 */

import { parse as parseCsv } from 'csv-parse/sync'

export type Generation = {
  /** Short code: `XV40`, `Mk5`, `Typ 1U`, or `''` when the source names none. */
  code: string
  /** Human label: `Fifth generation`, `XV40`, `Mk5` … */
  label: string
  yearFrom: number
  /** Last production year; null = still in production. */
  yearTo: number | null
  bodyStyles: string
  platform: string
  wikiTitle: string
  wikidataId: string
  source: 'wikidata' | 'prefix' | 'headings' | 'single'
}

const MIN_YEAR = 1940
const MAX_YEAR = 2035

/** Wikitext → plain text: refs, comments and templates dropped (template arguments kept), links unwrapped. */
export function cleanWikitext(raw: string): string {
  let s = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g, '')
    .replace(/<br\s*\/?>/gi, ', ')
    .replace(/<\/?(?:span|small|sup|sub|div|b|i)\b[^>]*>/gi, '')
  // Innermost templates first; `{{nowrap|1996}}` → `1996`, `{{plainlist|* a\n* b}}` → `a b`.
  for (let i = 0; i < 6 && /\{\{[^{}]*\}\}/.test(s); i++) {
    s = s.replace(/\{\{([^{}]*)\}\}/g, (_m, body: string) => {
      const [name = '', ...args] = body.split('|')
      if (/^\s*(cite|citation|efn|sfn|refn)/i.test(name)) return ''
      // `{{circa|1996}}` and friends: keep the arguments that are not `name=value`.
      return args.filter(a => !/^\s*[a-z_ ]+=/i.test(a)).join(' ')
    })
  }
  return s
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/&nbsp;|&ndash;/g, ' ')
    .replace(/^[*#:\s]+|\s*\n[*#:]+\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The first `{{Infobox …}}` block of a page (its own braces balanced), or the whole text when there is none. */
export function infoboxBlock(wikitext: string): string {
  const start = wikitext.search(/{{s*Infobox/i)
  if (start < 0) return wikitext
  let depth = 0
  for (let i = start; i < wikitext.length - 1; i++) {
    const two = wikitext.slice(i, i + 2)
    if (two === '{{') {
      depth++
      i++
    } else if (two === '}}') {
      depth--
      i++
      if (depth === 0) return wikitext.slice(start, i + 1)
    }
  }
  return wikitext.slice(start)
}

/** The `{{Infobox automobile}}` field `name` of the wikitext, cleaned; `''` when absent. */
export function infoboxField(page: string, name: string): string {
  const wikitext = infoboxBlock(page)
  const start = wikitext.search(new RegExp(`\\n\\s*\\|\\s*(?:${name})\\s*=`, 'i'))
  if (start < 0) return ''
  const rest = wikitext.slice(start + 1)
  const eq = rest.indexOf('=')
  // The value runs to the next top-level `| field =` line or the closing `}}`; nested templates may contain `|`.
  let depth = 0
  let end = rest.length
  for (let i = eq + 1; i < rest.length; i++) {
    const two = rest.slice(i, i + 2)
    if (two === '{{' || two === '[[') {
      depth++
      i++
    } else if (two === '}}' || two === ']]') {
      if (depth === 0) {
        end = i
        break
      }
      depth--
      i++
    } else if (rest[i] === '\n' && depth === 0 && /^\n\s*\|\s*[a-z_0-9 ]+=/i.test(rest.slice(i, i + 60))) {
      end = i
      break
    }
  }
  return cleanWikitext(rest.slice(eq + 1, end))
}

const validYear = (n: number): boolean => n >= MIN_YEAR && n <= MAX_YEAR

/**
 * The FIRST production range of an infobox value: `1996–2001` → 1996/2001, `2006–present` → 2006/null, `2018` → 2018/2018.
 * Only the first range counts — later ones are usually regional lines ("South Africa 1984–2009"), which made the first
 * probe report Golf Mk1 as 1974–2009. `to` is `undefined` when only a start year is known.
 */
export function parseYearRange(text: string): { from: number; to: number | null | undefined } | null {
  const range =
    /(?<!\d)((?:19|20)\d{2})\s*(?:[–—-]|\bto\b)\s*(?:[A-Za-z]{3,9}\.?\s+)?((?:19|20)\d{2}|present|current|now|ongoing)\b/i.exec(
      text
    ) ?? /(?<!\d)((?:19|20)\d{2})\s*(?:[–—-]|\bto\b)\s*(\d{2})(?!\d)/i.exec(text)
  if (range) {
    const from = Number(range[1])
    const rawTo = range[2]!.toLowerCase()
    if (!validYear(from)) return null
    if (/^\d+$/.test(rawTo)) {
      // `1996–01` = 1996–2001.
      const short = Math.floor(from / 100) * 100 + Number(rawTo)
      const to = rawTo.length === 2 ? (short < from ? short + 100 : short) : Number(rawTo)
      return validYear(to) && to >= from ? { from, to } : { from, to: undefined }
    }
    return { from, to: null }
  }
  const first = /(?<!\d)((?:19|20)\d{2})(?!\d)/.exec(text)
  if (!first) return null
  const year = Number(first[1])
  if (!validYear(year)) return null
  return { from: year, to: undefined }
}

/**
 * Generation years from an article's lead wikitext: the first range of `model_years` and of `production`; the earlier start
 * wins (production starts before the first model year) and so does the later end (open = still produced).
 */
export function infoboxYears(wikitext: string): { from: number; to: number | null | undefined } | null {
  const model = parseYearRange(infoboxField(wikitext, 'model_years'))
  const production = parseYearRange(infoboxField(wikitext, 'production'))
  if (!model || !production) return model ?? production
  const to =
    production.to === null || model.to === null ? null : Math.max(production.to ?? 0, model.to ?? 0) || undefined
  return { from: Math.min(production.from, model.from), to }
}

/** `production` ranges of a generation article that are regional variants, not the main generation. */
export const REGIONAL_TITLE =
  /facelift|\((?:north america|europe|asia|japan|china|chinese|india|indian|australia|brazil|brazilian|russia|taiwan|korea|south africa|us|usa|uk)\)|\b(?:north america|north american|chinese|indian|taiwanese)\b|and china/i

/**
 * Code and label of a generation article title relative to the series title:
 * `Toyota Camry (XV40)` → XV40; `Volkswagen Golf Mk5` → Mk5; `BMW 3 Series (E46)` → E46;
 * `Toyota Camry (XV70) …` and the series itself yield null.
 */
export function generationCode(title: string, seriesTitle: string): string | null {
  const paren = /\(([^()]+)\)\s*$/.exec(title)
  if (paren) {
    const inner = paren[1]!.trim()
    // `(2006)`, `(automobile)`, `(Japan and Europe seventh generation)` are not codes: a code is short and upper-case.
    if (!/^(?:Typ |Type |Mk\.? ?)?[A-Z0-9][A-Z0-9/.\- ]{0,12}$/.test(inner) || /^\d{4}$/.test(inner)) return null
    return inner.replace(/\s+/g, ' ')
  }
  const rest = title.startsWith(seriesTitle) ? title.slice(seriesTitle.length).trim() : ''
  if (
    /^(?:Mk\.?\s?\d+|Mark\s+[IVX\d]+|[A-Z]{1,3}\d{1,3}[A-Z]?|Typ\s?\w+|\d{1,2}[a-z]{0,2}\s+generation)$/i.test(rest)
  ) {
    return rest.replace(/^Mark\s+/i, 'Mk').replace(/^Mk\.?\s?/i, 'Mk')
  }
  return null
}

const ORDINALS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10
}

export type HeadingGeneration = { label: string; code: string; yearFrom: number; ordinal: number }

/**
 * Generations of a model that has no separate articles, from the main article's section headings:
 * `==First generation (Typ 1U; 1996)==`, `=== Third generation (J12; 2021) ===`, `== Second generation (2007–2013) ==`.
 */
export function headingGenerations(wikitext: string, seriesTitle = ''): HeadingGeneration[] {
  const out: HeadingGeneration[] = []
  for (const m of wikitext.matchAll(/^={2,4}\s*(.+?)\s*={2,4}\s*$/gm)) {
    const text = cleanWikitext(m[1]!)
    // `First generation X76 (FC/KC; 1997)`: a platform code may sit between the ordinal and the parenthesis.
    const ordinalHead = /^((?:\w+)\s+generation)\s*([A-Za-z0-9/-]{2,10})?\s*(?:\(([^)]*)\))?/i.exec(text)
    const markHead = ordinalHead ? null : /^(Mk\.?\s?\d+)\s*(?:\(([^)]*)\))?/i.exec(text)
    if (!ordinalHead && !markHead) continue
    const label = (ordinalHead?.[1] ?? markHead![1]!).replace(/\s+/g, ' ')
    if (/generation/i.test(label) && !(label.split(' ')[0]!.toLowerCase() in ORDINALS) && !/^\d/.test(label)) continue
    // Upper-case only: `facelift (2000)` is a word, `XFK (…)` a code.
    const rawCode = ordinalHead?.[2] ?? ''
    if (rawCode && (rawCode !== rawCode.toUpperCase() || /^\d+$/.test(rawCode))) continue
    const platformCode = rawCode
    const inner = (ordinalHead ? ordinalHead[3] : markHead![2]) ?? ''
    const years = parseYearRange(inner)
    if (!years) continue
    // The code is what is left of the parenthesis once the years are removed: `Typ 1U; 1996` → `Typ 1U`. A code written
    // before the parenthesis (`First generation X76 (FC/KC; 1997)`) wins: it names the generation, the rest its bodies.
    const code =
      platformCode ||
      inner
        .split(/[;,]/)
        .map(s => s.trim())
        .filter(s => s && !/^(?:19|20)\d{2}\b/.test(s))
        .join(' ')
    const ordinal = ORDINALS[label.split(' ')[0]!.toLowerCase()] ?? Number(/\d+/.exec(label)?.[0] ?? 0)
    out.push({ label, code, yearFrom: years.from, ordinal })
  }
  const numbered = dedupeByYear(out)
  return numbered.length >= 2 ? numbered : (codedHeadings(wikitext, seriesTitle) ?? numbered)
}

/**
 * Generations named by a code instead of an ordinal: `C4 (Typ 4A, 1994)`, `Vectra A (1988–1995)`, `Zafira A (1999)`. Many
 * headings look alike (`S6 (2012–2018)`, `A6L (2005–2009)`), so only the longest run of consecutive codes of one shape counts:
 * letters A, B, C… or one prefix with rising numbers (C4, C5, C6). The name before a letter must be words of the series title.
 */
function codedHeadings(wikitext: string, seriesTitle: string): HeadingGeneration[] | null {
  const titleWords = new Set(seriesTitle.toLowerCase().split(/\s+/).filter(Boolean))
  type Cand = { shape: string; rank: number; yearFrom: number; code: string }
  const cands: Cand[] = []
  for (const m of wikitext.matchAll(/^={2,4}\s*(.+?)\s*={2,4}\s*$/gm)) {
    const text = cleanWikitext(m[1]!)
    const h = /^((?:[A-Z][\w'-]*\s+){0,2}?)([A-Z]|[A-Z]{1,2}\d{1,3})(?:\/[^(]*?)?\s*\(([^)]*)\)/.exec(text)
    if (!h) continue
    const name = h[1]!.trim()
    const token = h[2]!
    if (
      name &&
      !name
        .toLowerCase()
        .split(/\s+/)
        .every(w => titleWords.has(w))
    )
      continue
    const years = parseYearRange(h[3]!)
    if (!years) continue
    const letter = token.length === 1
    const prefix = letter ? '' : /^[A-Z]+/.exec(token)![0]
    cands.push({
      shape: letter ? `letter|${name}` : `num|${prefix}`,
      rank: letter ? token.charCodeAt(0) - 64 : Number(/\d+/.exec(token)![0]),
      yearFrom: years.from,
      code: [name, token].filter(Boolean).join(' ')
    })
  }
  let best: Cand[] = []
  for (const shape of new Set(cands.map(c => c.shape))) {
    const own = cands
      .filter(c => c.shape === shape)
      .sort((a, b) => a.rank - b.rank)
      .filter((c, i, all) => i === 0 || c.rank !== all[i - 1]!.rank)
    // Longest run of consecutive ranks with rising start years.
    let run: Cand[] = []
    for (const c of own) {
      const last = run.at(-1)
      run = last && c.rank === last.rank + 1 && c.yearFrom > last.yearFrom ? [...run, c] : [c]
      if (run.length > best.length) best = run
    }
  }
  if (best.length < 2) return null
  return best.map(c => ({ label: c.code, code: c.code, yearFrom: c.yearFrom, ordinal: c.rank }))
}

/**
 * Heading generations whose end year is known: a generation counts only when the next one is the next ordinal (or it is the
 * last). An article that skips "Second generation" would otherwise stretch the first one over the missing years.
 */
export function trustedHeadings(list: HeadingGeneration[]): HeadingGeneration[] {
  const sorted = [...list].sort((a, b) => a.yearFrom - b.yearFrom)
  return sorted.filter((g, i) => {
    const next = sorted[i + 1]
    return !next || (g.ordinal > 0 && next.ordinal === g.ordinal + 1)
  })
}

function dedupeByYear(list: HeadingGeneration[]): HeadingGeneration[] {
  const seen = new Set<string>()
  return list.filter(g => {
    const key = `${g.label}|${g.yearFrom}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const ordinalLabel = (n: number): string =>
  `${Object.entries(ORDINALS).find(([, v]) => v === n)?.[0] ?? String(n)} generation`.replace(/^./, c =>
    c.toUpperCase()
  )

/**
 * Orders generations by start year, drops duplicates (same start) and fills a missing end year with the next generation's
 * start year (one production year is shared); the last generation keeps its own end (null = ongoing).
 */
export function finishGenerations(all: Generation[]): Generation[] {
  // A variant with its own article (BMW X5 M "F85" 2014–2018 inside F15 2013–2018) is not a generation: drop spans that sit
  // inside another one's stated span.
  const list = all.filter(
    g =>
      g.yearTo === null ||
      !all.some(
        o =>
          o !== g &&
          o.yearTo !== null &&
          o.yearFrom <= g.yearFrom &&
          g.yearFrom - o.yearFrom <= 2 &&
          g.yearTo! <= o.yearTo &&
          o.yearTo - g.yearTo! <= 1 &&
          (o.yearFrom < g.yearFrom || o.yearTo > g.yearTo!)
      )
  )
  const sorted = [...list].sort((a, b) => a.yearFrom - b.yearFrom || (b.yearTo ?? 9999) - (a.yearTo ?? 9999))
  const unique = sorted.filter((g, i) => i === 0 || g.yearFrom !== sorted[i - 1]!.yearFrom)
  return unique.map((g, i) => {
    const next = unique[i + 1]
    if (!next) return g
    // A stated end that overruns the next start by more than the facelift overlap is regional noise: clamp it.
    const yearTo =
      g.yearTo === null || g.yearTo === undefined || g.yearTo > next.yearFrom + 1 ? next.yearFrom : g.yearTo
    return { ...g, yearTo: Math.max(yearTo, g.yearFrom) }
  })
}

/**
 * Name of a generation article, or null when the title is not one (a variant, a performance model, another series):
 * `Ford Focus (first generation)` → label "First generation"; `Ford Focus (second generation, Europe)` → same, the European
 * article is the main one; `(second generation, North America)` → null; `Toyota Camry (XV40)` → code XV40; `Audi S6` → null.
 */
export function generationName(title: string, seriesTitle: string): { code: string; label: string } | null {
  if (REGIONAL_TITLE.test(title)) return null
  const ordinal = /\((\w+) generation(?:,\s*([^)]+))?\)\s*$/i.exec(title)
  if (ordinal) {
    const n = ORDINALS[ordinal[1]!.toLowerCase()]
    if (!n || (ordinal[2] && !/^europe(an)?$/i.test(ordinal[2].trim()))) return null
    return { code: '', label: ordinalLabel(n) }
  }
  const code = generationCode(title, seriesTitle)
  return code ? { code, label: code } : null
}

/** Years not covered between neighbours plus mid-list spans under two years (a clamped variant): lower = a cleaner chain. */
export function chainDefects(list: Generation[]): number {
  let defects = 0
  list.forEach((g, i) => {
    const next = list[i + 1]
    if (next && g.yearTo !== null && next.yearFrom - g.yearTo > 1) defects++
    if (next && g.yearTo !== null && g.yearTo - g.yearFrom < 2) defects++
  })
  return defects
}

/** More generations is better, each defect costs two: a long chain with a hole still beats a short clean one (Passat). */
export const chainScore = (list: Generation[]): number => list.length - 2 * chainDefects(list)

/** Generations of the other sources that start inside a hole of the chosen chain (Passat B7 2010–2014 between B6 and B8). */
export function fillGaps(best: Generation[], others: Generation[]): Generation[] {
  const extra = others.filter(o => {
    if (best.some(b => b.yearFrom === o.yearFrom || (!!b.code && b.code === o.code))) return false
    const before = [...best].reverse().find(b => b.yearFrom < o.yearFrom)
    const after = best.find(b => b.yearFrom > o.yearFrom)
    if (!before || before.yearTo === null) return false
    // Inside a hole, or after a chain that ended before this generation started (Polo Mk6 after Mk5 2009–2017).
    return after ? before.yearTo <= o.yearFrom && o.yearFrom < after.yearFrom : before.yearTo <= o.yearFrom
  })
  return extra.length === 0 ? best : finishGenerations([...best, ...extra])
}

/** `production` and its names in the other editions' infoboxes (de Infobox Bus; ru/uk card templates). */
const PRODUCTION_FIELD =
  'production|Produktionszeitraum|Годы производства|годы выпуска|Роки виробництва|роки виробництва'

export type TitlePin = { lang: string; title: string }

/** `generations-titles.csv` (`query,title[,lang]`): the article to read for a registry name; `lang` defaults to en. */
export function parseTitlePins(csv: string, normalize: (query: string) => string): Map<string, TitlePin> {
  const out = new Map<string, TitlePin>()
  for (const r of parseCsv(csv, { columns: true, skip_empty_lines: true, relax_column_count: true }) as Record<
    string,
    string
  >[])
    out.set(normalize(r.query!), { lang: r.lang?.trim() || 'en', title: r.title! })
  return out
}

/**
 * The widest production span an article states, for a model with ONE generation: `1997–2002 (Daewoo) / 1997–2020 (licence-built)`
 * → 1997–2020, because licence-built cars (ZAZ Lanos until 2017) sit in our registry. null end = still produced.
 * A short end (`2008–19`) is expanded. A field that lists several models (`F800GS (2008–19)<br/>F700GS (2012–19)`) is narrowed
 * to the entries naming `model` (folded to [a-z0-9]) when any does.
 */
export function productionSpan(wikitext: string, model = ''): { from: number; to: number | null } | null {
  const fold = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
  const field = infoboxField(wikitext, PRODUCTION_FIELD) || deProductionRange(wikitext)
  const entries = field.split(/,\s+|;\s*|\n/)
  const named = model ? entries.filter(e => fold(e).includes(fold(model))) : []
  const text = named.length > 0 ? named.join('\n') : field
  const years = [...text.matchAll(/(?<!\d)((?:19|20)\d{2})(?:\s*[–—-]\s*((?:19|20)?\d{2})(?!\d))?(?!\d)/g)].flatMap(
    m => {
      const from = Number(m[1])
      const end =
        m[2] === undefined ? [] : [m[2].length === 2 ? Math.floor(from / 100) * 100 + Number(m[2]) : Number(m[2])]
      return [from, ...end]
    }
  )
  const valid = years.filter(validYear)
  if (valid.length === 0)
    return infoboxYears(wikitext) && { from: infoboxYears(wikitext)!.from, to: infoboxYears(wikitext)!.to ?? null }
  const from = Math.min(...valid)
  // A lone start year (`March 2011`) in a motorcycle infobox means still produced; for cars it is a one-year span.
  const loneStart =
    new Set(valid).size === 1 && !/[–—-]\s*(?:19|20)?\d{2}/.test(text) && MOTORCYCLE_INFOBOX.test(wikitext)
  return { from, to: loneStart || /present|current|ongoing|now/i.test(text) ? null : Math.max(...valid) }
}

/** `Infobox Motorrad` keeps the span in two fields (`Produktion von = 2018`, `Produktion bis = 2024`); a missing end reads as open. */
function deProductionRange(wikitext: string): string {
  const from = infoboxField(wikitext, 'Produktion von')
  const to = infoboxField(wikitext, 'Produktion bis')
  return from && to ? `${from}–${to}` : from
}

const MOTORCYCLE_INFOBOX = /\{\{\s*Infobox[ _](?:motorcycle|Motorrad)/i
