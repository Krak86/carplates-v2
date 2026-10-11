/**
 * Pure parsing for the car-generations ingest (`generations.ts`): Wikipedia wikitext (infobox fields, section headings,
 * article titles) → generation rows. No network, no DB. Facts only (years, codes, body styles) — Wikipedia text is CC BY-SA.
 */

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
  source: 'wikidata' | 'prefix' | 'headings'
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
  const start = wikitext.search(new RegExp(`\\n\\s*\\|\\s*${name}\\s*=`, 'i'))
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
export function headingGenerations(wikitext: string): HeadingGeneration[] {
  const out: HeadingGeneration[] = []
  for (const m of wikitext.matchAll(/^={2,4}\s*(.+?)\s*={2,4}\s*$/gm)) {
    const text = cleanWikitext(m[1]!)
    const g =
      /^((?:\w+)\s+generation)\s*(?:\(([^)]*)\))?/i.exec(text) ?? /^(Mk\.?\s?\d+)\s*(?:\(([^)]*)\))?/i.exec(text)
    if (!g) continue
    const label = g[1]!.replace(/\s+/g, ' ')
    if (/generation/i.test(label) && !(label.split(' ')[0]!.toLowerCase() in ORDINALS) && !/^\d/.test(label)) continue
    const inner = g[2] ?? ''
    const years = parseYearRange(inner)
    if (!years) continue
    // The code is what is left of the parenthesis once the years are removed: `Typ 1U; 1996` → `Typ 1U`.
    const code = inner
      .split(/[;,]/)
      .map(s => s.trim())
      .filter(s => s && !/^(?:19|20)\d{2}\b/.test(s))
      .join(' ')
    const ordinal = ORDINALS[label.split(' ')[0]!.toLowerCase()] ?? Number(/\d+/.exec(label)?.[0] ?? 0)
    out.push({ label, code, yearFrom: years.from, ordinal })
  }
  return dedupeByYear(out)
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
