/**
 * Wikipedia infobox → spec fields (stage K). Pure: wikitext in, tolerant numbers out. Values are free text
 * (`{{convert|2700|mm|in}}`, `1.6 L I4 (petrol) 110 PS`, `<br>` lists), so a figure is returned only when it is unambiguous;
 * anything else stays a raw string for a "details" view. Facts only — Wikipedia text is CC BY-SA.
 */

const LINK = /\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g
const RANGE_WORDS = new Set(['-', '–', '—', 'to', 'and', 'or', 'ndash'])

/** Unit → factor to the base unit of its kind (mm, kg, litre). */
const UNITS: Record<string, { kind: 'length' | 'mass' | 'volume'; factor: number }> = {
  mm: { kind: 'length', factor: 1 },
  мм: { kind: 'length', factor: 1 },
  см: { kind: 'length', factor: 10 },
  м: { kind: 'length', factor: 1000 },
  кг: { kind: 'mass', factor: 1 },
  л: { kind: 'volume', factor: 1 },
  cm: { kind: 'length', factor: 10 },
  m: { kind: 'length', factor: 1000 },
  in: { kind: 'length', factor: 25.4 },
  ft: { kind: 'length', factor: 304.8 },
  kg: { kind: 'mass', factor: 1 },
  t: { kind: 'mass', factor: 1000 },
  lb: { kind: 'mass', factor: 0.45359237 },
  lbs: { kind: 'mass', factor: 0.45359237 },
  l: { kind: 'volume', factor: 1 },
  litres: { kind: 'volume', factor: 1 },
  liters: { kind: 'volume', factor: 1 },
  usgal: { kind: 'volume', factor: 3.785411784 },
  impgal: { kind: 'volume', factor: 4.54609 }
}

/** Sanity bounds per field (like the RDW query): outside = a typo or a wrong unit, not a car. */
export const WIKI_SPEC_BOUNDS = {
  wheelbaseMm: [1000, 10000],
  lengthMm: [1000, 25000],
  widthMm: [400, 3000],
  heightMm: [500, 4500],
  kerbKg: [50, 60000],
  fuelTankL: [3, 1500]
} as const

export type Measure = { value: number; min: number; max: number }

export type WikiEngine = {
  displacementCc: number | null
  cylinders: number | null
  powerKw: number | null
  fuel: 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'lpg' | null
  raw: string
}

export type WikiSpecs = {
  wheelbaseMm: Measure | null
  lengthMm: Measure | null
  widthMm: Measure | null
  heightMm: Measure | null
  kerbKg: Measure | null
  fuelTankL: Measure | null
  layout: string
  transmission: string
  engines: WikiEngine[]
  /** Raw strings of the fields that had text but no unambiguous number (the "details" view). */
  rawOnly: Partial<Record<'wheelbase' | 'length' | 'width' | 'height' | 'weight' | 'fuel_capacity', string>>
}

/** Wikitext → plain lines: refs and comments dropped, templates expanded (`convert` keeps the first unit), list items split. */
export function expandWikitext(raw: string): string[] {
  let s = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:span|small|sup|sub|div|b|i|nowiki)\b[^>]*>/gi, '')
    .replace(LINK, '$1')
  for (let i = 0; i < 8 && /\{\{[^{}]*\}\}/.test(s); i++) {
    s = s.replace(/\{\{([^{}]*)\}\}/g, (_m, body: string) => expandTemplate(body))
  }
  return s
    .replace(/'{2,}/g, '')
    .replace(/&nbsp;|&#160;|\xa0/g, ' ')
    .replace(/&ndash;|&mdash;/g, '–')
    .split('\n')
    .map(l =>
      l
        .replace(/^[*#:\s]+/, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean)
}

function expandTemplate(body: string): string {
  const [rawName = '', ...parts] = body.split('|')
  const name = rawName.trim().toLowerCase()
  const positional = parts.map(p => p.trim()).filter(p => !/^[a-z_ ]+=/i.test(p))
  if (/^(?:cite|citation|efn|sfn|refn|citation needed|cn|clarify|when|who|dubious|fact)\b/.test(name)) return ''
  if (name === 'convert' || name === 'cvt') {
    const [a = '', b = '', c = '', d = ''] = positional
    // `{{convert|1400|-|1600|kg|lb}}` / `{{convert|1400|to|1600|kg}}` → "1400–1600 kg".
    if (RANGE_WORDS.has(b.toLowerCase())) return `${a}–${c} ${d}`
    return `${a} ${b}`
  }
  if (name === 'cc') return `${positional[0] ?? ''} cc`
  if (/^(?:plainlist|unbulleted list|ubl|hlist|flatlist|bulleted list|ublist|plain list)$/.test(name)) {
    return positional.join('\n')
  }
  if (name === 'lang' || name === 'transliteration') return positional.at(-1) ?? ''
  if (name === 'frac') return positional.join(' ')
  return positional.join(' ')
}

/** Every `number unit` in a line, converted to the base unit of `kind`; ranges `a–b unit` yield two numbers. */
export function measuresOf(line: string, kind: 'length' | 'mass' | 'volume', allowBare = false): number[] {
  const out: number[] = []
  const text = line
    .replace(/(\d)[,\xa0 ](\d{3})(?!\d)/g, '$1$2')
    .replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2')
    .replace(/\bUS\s+gal\b/gi, 'usgal')
    .replace(/\bimp(?:erial)?\s+gal\b/gi, 'impgal')
  const re =
    /(\d+(?:\.\d+)?)\s*(?:[–—-]\s*(\d+(?:\.\d+)?))?\s*(mm|cm|m|in|ft|kg|t|lbs?|l|litres|liters|usgal|impgal|мм|см|м|кг|л)(?![\p{L}\d])/giu
  for (const m of text.matchAll(re)) {
    const unit = UNITS[m[3]!.toLowerCase()]
    if (!unit || unit.kind !== kind) continue
    for (const n of [m[1], m[2]]) if (n !== undefined) out.push(Number(n) * unit.factor)
  }
  // Editions that print bare numbers in the field's own unit (de "Länge = 4255–4586"): mm / kg / litres.
  if (out.length === 0 && allowBare) {
    const bare = /^\s*(\d+(?:\.\d+)?)(?:\s*[–—-]\s*(\d+(?:\.\d+)?))?\s*$/.exec(text)
    if (bare) for (const n of [bare[1], bare[2]]) if (n !== undefined) out.push(Number(n))
  }
  return out
}

/**
 * One headline figure from a field's lines. Several lines or numbers are accepted only when they are the SAME value in
 * different units (`2700 mm (106 in)`) or a min–max range; a list of variants ("Sedan: 4885 mm", "Wagon: 4930 mm") stays
 * ambiguous → null, and the caller keeps the raw text. `bounds` rejects typos and wrong units.
 */
export function parseMeasure(
  lines: string[],
  kind: 'length' | 'mass' | 'volume',
  bounds: readonly [number, number],
  allowBare = false
): Measure | null {
  const perLine = lines.map(l => measuresOf(l, kind, allowBare)).filter(a => a.length > 0)
  if (perLine.length === 0) return null
  // Several lines = several variants unless they all carry the same value.
  const firsts = perLine.map(a => a[0]!)
  if (perLine.length > 1 && Math.max(...firsts) - Math.min(...firsts) > Math.max(...firsts) * 0.005) return null
  const nums = perLine[0]!
  // `a–b unit` gives [a, b]; `a unit (b other-unit)` gives [a, a·k] — the same value twice. Tell them apart by size.
  const a = nums[0]!
  const b = nums[1]
  const isRange =
    b !== undefined &&
    Math.abs(b - a) > a * 0.005 &&
    /\d\s*[–—-]\s*\d/.test(lines.find(l => measuresOf(l, kind, allowBare)[0] === a) ?? '')
  const min = a
  const max = isRange ? b : a
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  if (lo < bounds[0] || hi > bounds[1]) return null
  return { value: Math.round((lo + hi) / 2), min: Math.round(lo), max: Math.round(hi) }
}

const FUELS: [RegExp, NonNullable<WikiEngine['fuel']>][] = [
  [/(?<![\p{L}\d])(?:diesel|tdi|cdi|dci|hdi|crdi|tdci|d-4d|дизель|дизельний|dízel)(?![\p{L}\d])/iu, 'diesel'],
  [/(?<![\p{L}\d])(?:electric|bev|kwh|электро|електро)/iu, 'electric'],
  [/(?<![\p{L}\d])(?:hybrid|phev|hev|гибрид|гібрид)/iu, 'hybrid'],
  [/(?<![\p{L}\d])(?:lpg|cng|natural gas)(?![\p{L}\d])/iu, 'lpg'],
  [/(?<![\p{L}\d])(?:petrol|gasoline|gas|бензин)/iu, 'petrol']
]

const WORD_CYL: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, ten: 10, twelve: 12 }

/** One engine line: `1.6 L I4 (petrol) 110 PS`, `2,2 л 5S-FE I4 (136 л. с.)`. Each field null when not found. */
export function parseEngine(line: string): WikiEngine {
  const text = line.replace(/(\d),(\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d)(?!\d)/g, '$1.$2')
  let displacementCc: number | null = null
  const litres = /(\d(?:\.\d{1,2})?)\s*(?:l|litres?|liters?|л)(?![\p{L}\d])/iu.exec(text)
  const cc = /(\d{3,5})\s*(?:cc|cm³|см³)/i.exec(text)
  if (litres) displacementCc = Math.round(Number(litres[1]) * 1000)
  else if (cc) displacementCc = Number(cc[1])
  if (displacementCc !== null && (displacementCc < 40 || displacementCc > 20000)) displacementCc = null

  let cylinders: number | null = null
  const code = /(?<![\p{L}\d])(?:I|V|H|F|W|R|L|flat-?|straight-?|inline-?)\s?(\d{1,2})(?![\p{L}\d])/iu.exec(text)
  const word = /\b(?:inline|straight|flat|v|w)[- ](two|three|four|five|six|eight|ten|twelve)\b/i.exec(text)
  if (word) cylinders = WORD_CYL[word[1]!.toLowerCase()] ?? null
  else if (code) cylinders = Number(code[1])
  if (cylinders !== null && (cylinders < 1 || cylinders > 16)) cylinders = null

  // Power: kW as is, PS / hp / bhp / CV × 0.7355 (metric) — a unit-less number is never taken.
  let powerKw: number | null = null
  const kw = /(\d{2,4})\s*(?:kW|кВт)(?![\p{L}\d])/iu.exec(text)
  const ps = /(\d{2,4})\s*(?:PS|CV|ch|bhp|hp|л\.\s?с\.?|к\.\s?с\.?)(?![\p{L}\d])/iu.exec(text)
  if (kw) powerKw = Number(kw[1])
  else if (ps) powerKw = Math.round(Number(ps[1]) * 0.7355)
  if (powerKw !== null && (powerKw < 5 || powerKw > 1500)) powerKw = null

  const fuel = FUELS.find(([re]) => re.test(text))?.[1] ?? null
  return { displacementCc, cylinders, powerKw, fuel, raw: line }
}

/** Infobox template names: en, ru (+ the per-generation sub-template), uk, de, ja, ko, cs. */
const INFOBOX_NAME =
  /^(?:infobox[ _]automobile|infobox[ _]motorcycle|infobox[ _]bus|infobox[ _]truck|infobox[ _]vehicle|автомобиль|модификация автомобиля|картка:автомобіль|модифікація автомобіля|infobox[ _]pkw-modell(?:[ _]generationen)?|infobox[ _]自動車基本情報|자동차 정보|infobox - automobil)$/i
const SUB_NAME = /^(?:модификация автомобиля|модифікація автомобіля)$/i

/** Parameter names per field: English first, then the same facts under the other editions' names. */
const ALIASES = {
  name: ['name', 'название', 'назва'],
  wheelbase: [
    'wheelbase',
    'колёсная база',
    'колісна_база',
    'колісна база',
    'radstand',
    'rozvor',
    '축간거리',
    'ホイールベース'
  ],
  length: ['length', 'длина', 'довжина', 'länge', 'délka', '전장', '全長'],
  width: ['width', 'ширина', 'breite', 'šířka', '전폭', '全幅'],
  height: ['height', 'высота', 'висота', 'höhe', 'výška', '전고', '全高'],
  weight: ['weight', 'масса', 'вага', 'gewicht', 'hmotnost', '전비중량', '車両重量'],
  fuel_capacity: ['fuel_capacity', 'объём бака', 'бак', 'tankinhalt', '燃料タンク容量'],
  layout: ['layout', 'привод', 'компонування', 'antrieb', 'koncepce', '구동방식', '駆動方式'],
  transmission: ['transmission', 'кпп', 'трансмісія', 'getriebe', '변속기', 'トランスミッション'],
  engine: ['engine', 'двигатель', 'двигун', 'motoren', 'motor', 'エンジン', '엔진']
} as const
type Alias = keyof typeof ALIASES

/** Bare numbers in these editions are in the field's own unit (mm / kg / litres). */
const BARE_NUMBER_LANGS = new Set(['de', 'cs', 'ru', 'uk', 'ja', 'ko'])

type Block = { name: string; text: string }

/** Every infobox-like template of the page, in order, with the nested infobox templates cut out of each one's own text. */
export function infoboxBlocks(wikitext: string): Block[] {
  const spans: { name: string; start: number; end: number }[] = []
  const stack: number[] = []
  for (let i = 0; i < wikitext.length - 1; i++) {
    const two = wikitext.slice(i, i + 2)
    if (two === '{{') {
      stack.push(i)
      i++
    } else if (two === '}}') {
      const start = stack.pop()
      i++
      if (start === undefined) continue
      const name = /^\{\{\s*([^|\n{}]*)/.exec(wikitext.slice(start, start + 120))?.[1]?.trim() ?? ''
      if (INFOBOX_NAME.test(name)) spans.push({ name, start, end: i + 1 })
    }
  }
  spans.sort((a, b) => a.start - b.start)
  return spans.map(sp => {
    const inner = spans.filter(o => o !== sp && o.start > sp.start && o.end <= sp.end)
    let text = ''
    let at = sp.start
    for (const o of inner) {
      if (o.start < at) continue
      text += wikitext.slice(at, o.start)
      at = o.end
    }
    return { name: sp.name, text: text + wikitext.slice(at, sp.end) }
  })
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Raw value of the first of `names` that is present and non-empty in the block. */
function blockField(block: string, names: readonly string[]): string {
  for (const name of names) {
    const m = new RegExp(`(?:^|\\n)\\s*\\|\\s*${escapeRegExp(name)}\\s*=`, 'iu').exec(block)
    if (!m) continue
    const rest = block.slice(m.index + m[0].length)
    let depth = 0
    let end = rest.length
    for (let i = 0; i < rest.length; i++) {
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
      } else if (rest[i] === '\n' && depth === 0 && /^\n\s*\|\s*[^|=\n]+=/u.test(rest.slice(i, i + 80))) {
        end = i
        break
      }
    }
    const value = rest.slice(0, end)
    if (expandWikitext(value).length > 0) return value
  }
  return ''
}

const codeKey = (s: string): string => s.toLowerCase().replace(/[^\p{L}\d]+/gu, '')

export type ParseOptions = {
  /** Wikipedia edition of the text ('en', 'ru' …): decides whether bare numbers are accepted as mm / kg / litres. */
  lang?: string
  /** Generation code (XV70, Mk7): picks the matching per-generation sub-block of a model article (ru "Модификация автомобиля"). */
  code?: string
}

/** All spec fields of one article's infobox (the sub-block of `opts.code` when the article has one, else the main one). */
export function parseWikiSpecs(wikitext: string, opts: ParseOptions = {}): WikiSpecs {
  const blocks = infoboxBlocks(wikitext)
  const code = opts.code ? codeKey(opts.code) : ''
  const sub = code
    ? blocks.find(b => SUB_NAME.test(b.name) && codeKey(blockField(b.text, ALIASES.name)).includes(code))
    : undefined
  const main = sub ?? blocks.find(b => !SUB_NAME.test(b.name))
  const allowBare = BARE_NUMBER_LANGS.has(opts.lang ?? 'en')
  const field = (a: Alias): string[] => (main ? expandWikitext(blockField(main.text, ALIASES[a])) : [])
  const rawOnly: WikiSpecs['rawOnly'] = {}
  const measure = (
    name: keyof WikiSpecs['rawOnly'],
    kind: 'length' | 'mass' | 'volume',
    bounds: readonly [number, number]
  ): Measure | null => {
    const lines = field(name)
    const parsed = parseMeasure(lines, kind, bounds, allowBare)
    if (!parsed && lines.length > 0) rawOnly[name] = lines.join(' / ').slice(0, 300)
    return parsed
  }
  return {
    wheelbaseMm: measure('wheelbase', 'length', WIKI_SPEC_BOUNDS.wheelbaseMm),
    lengthMm: measure('length', 'length', WIKI_SPEC_BOUNDS.lengthMm),
    widthMm: measure('width', 'length', WIKI_SPEC_BOUNDS.widthMm),
    heightMm: measure('height', 'length', WIKI_SPEC_BOUNDS.heightMm),
    kerbKg: measure('weight', 'mass', WIKI_SPEC_BOUNDS.kerbKg),
    fuelTankL: measure('fuel_capacity', 'volume', WIKI_SPEC_BOUNDS.fuelTankL),
    layout: field('layout').join('; ').slice(0, 200),
    transmission: field('transmission').join('; ').slice(0, 300),
    // Header lines ("Petrol:") and prose carry no figure: keep only lines that parse to something numeric.
    engines: field('engine')
      .map(parseEngine)
      .filter(e => e.displacementCc !== null || e.powerKw !== null),
    rawOnly
  }
}
