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
  /** Body-table rows only: the top of a power range ("201 hp pre-facelift / 205 hp facelift"), null when single. */
  powerKwMax?: number | null
  /**
   * Body-table rows only: chassis / model codes ("FK1 (Hatchback)" → ['FK1']). When the code column's header is ambiguous
   * ("Code", "Type/code") `engineCodes` is absent and this holds the whole column; the reader guesses by shape.
   */
  chassisCodes?: string[]
  /** Body-table rows only: engine codes (`2TR-FE`, `B48`). Present (maybe empty) only when the table's header named its code column. */
  engineCodes?: string[]
  note?: string
  years?: string
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
  [/(?<![\p{L}\d])(?:petrol|gasoline|gas|бензин|benzin|ottomotor)/iu, 'petrol']
]

const WORD_CYL: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, ten: 10, twelve: 12 }

/** Power in kW: kW as is, PS / CV / ch / л. с. × 0.7355 (metric), hp / bhp × 0.7457 (mechanical) — a unit-less number is never taken. */
export function powerKwOf(text: string): number | null {
  const kw = /(\d{2,4}(?:\.\d{1,2})?)\s*(?:kW|кВт)(?![\p{L}\d])/iu.exec(text)
  const metric = /(\d{2,4}(?:\.\d{1,2})?)\s*(?:PS|CV|ch|л\.\s?с\.?|к\.\s?с\.?)(?![\p{L}\d])/iu.exec(text)
  const mech = /(\d{2,4}(?:\.\d{1,2})?)\s*(?:bhp|hp)(?![\p{L}\d])/iu.exec(text)
  let powerKw: number | null = null
  if (kw) powerKw = Math.round(Number(kw[1]))
  else if (metric) powerKw = Math.round(Number(metric[1]) * 0.7355)
  else if (mech) powerKw = Math.round(Number(mech[1]) * 0.7457)
  return powerKw !== null && (powerKw < 5 || powerKw > 1500) ? null : powerKw
}

/** One engine line: `1.6 L I4 (petrol) 110 PS`, `2,2 л 5S-FE I4 (136 л. с.)`. Each field null when not found. */
export function parseEngine(line: string): WikiEngine {
  const text = line.replace(/(\d),(\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d)(?!\d)/g, '$1.$2')
  let displacementCc: number | null = null
  const litres = /(?<![\d.])(\d{1,2}(?:\.\d{1,2})?)\s*(?:l|litres?|liters?|литр\p{L}*|л)(?![\p{L}\d])/iu.exec(text)
  const cc = /(\d{3,5}(?:\.\d)?)\s*(?:cc|cm³|cm3|см³)/i.exec(text)
  // An explicit cc figure beats a litre one: a bike's spec table lists "248 cc … SAE 10W40/1.9 L" (the oil capacity).
  if (cc) displacementCc = Math.round(Number(cc[1]))
  else if (litres) displacementCc = Math.round(Number(litres[1]) * 1000)
  if (displacementCc !== null && (displacementCc < 40 || displacementCc > 20000)) displacementCc = null

  let cylinders: number | null = null
  const code = /(?<![\p{L}\d])(?:I|V|H|F|W|R|L|flat-?|straight-?|inline-?)\s?(\d{1,2})(?![\p{L}\d])/iu.exec(text)
  const word = /\b(?:inline|straight|flat|v|w)[- ](two|three|four|five|six|eight|ten|twelve)\b/i.exec(text)
  if (word) cylinders = WORD_CYL[word[1]!.toLowerCase()] ?? null
  else if (code) cylinders = Number(code[1])
  if (cylinders !== null && (cylinders < 1 || cylinders > 16)) cylinders = null

  const powerKw = powerKwOf(text)

  const fuel = FUELS.find(([re]) => re.test(text))?.[1] ?? null
  return { displacementCc, cylinders, powerKw, fuel, raw: line }
}

/** Infobox template names: en, ru (+ the per-generation sub-template), uk, de, ja, ko, cs. */
const INFOBOX_NAME =
  /^(?:infobox[ _]automobile|infobox[ _]motorcycle|infobox[ _]motorrad|infobox[ _](?:uk[ _])?bus|infobox[ _]truck|infobox[ _]vehicle|автомобиль|модификация автомобиля|картка:автомобіль|модифікація автомобіля|infobox[ _]pkw-modell(?:[ _]generationen)?|infobox[ _]自動車基本情報|자동차 정보|infobox - automobil)$/i
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
  weight: ['weight', 'wet_weight', 'масса', 'вага', 'gewicht', 'hmotnost', '전비중량', '車両重量'],
  power: ['power', 'powerout'],
  de_displacement: ['hubraum'],
  de_power: ['leistung'],
  fuel_capacity: ['fuel_capacity', 'объём бака', 'бак', 'tankinhalt', '燃料タンク容量'],
  layout: ['layout', 'привод', 'компонування', 'antrieb', 'koncepce', '구동방식', '駆動方式'],
  transmission: ['transmission', 'кпп', 'трансмісія', 'getriebe', '변속기', 'トランスミッション'],
  engine: ['engine', 'двигатель', 'двигун', 'motoren', 'motor', 'エンジン', '엔진'],
  production: ['production', 'годы производства', 'роки виробництва', 'produktionszeit', 'bauzeit', '生産期間']
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

/** The block of a multi-infobox article (one per generation) whose production start is within a year of `yearFrom`; the closest wins. */
function blockByYear(blocks: Block[], yearFrom: number | undefined): Block | undefined {
  if (!yearFrom || blocks.length < 2) return undefined
  const spans = blocks.map(b => {
    const years = [...blockField(b.text, ALIASES.production).matchAll(/(?<!\d)((?:19|20)\d{2})(?!\d)/g)].map(m =>
      Number(m[1])
    )
    // The first range only ("2007–2013 / 2007–2013 (China)"); an open range is as wide as it gets.
    return years[0] === undefined
      ? null
      : {
          off: Math.abs(years[0] - yearFrom),
          width: years[1] !== undefined && years[1] >= years[0] ? years[1] - years[0] : Infinity
        }
  })
  // The closest start wins; of equally close ones the narrowest span, so a per-generation block beats the model-wide one.
  let best = -1
  spans.forEach((s, i) => {
    if (!s || s.off > 1) return
    const cur = spans[best]
    if (!cur || s.off < cur.off || (s.off === cur.off && s.width < cur.width)) best = i
  })
  return blocks[best]
}

const ENGINE_TEMPLATE = /^\{\{\s*(?:двигатель|двигун)/i
const PETROL_WORD = /(?<![\p{L}\d])(?:АИ|аи|бензин\p{L}*)/u
const DIESEL_WORD = /(?<![\p{L}\d])(?:ДТ|дизел\p{L}*)/iu

/** The text of the `{{…}}` template starting at `start` (braces balanced), or '' when it never closes. */
function templateAt(raw: string, start: number): string {
  let depth = 0
  for (let j = start; j < raw.length - 1; j++) {
    const two = raw.slice(j, j + 2)
    if (two === '{{') {
      depth++
      j++
    } else if (two === '}}') {
      depth--
      j++
      if (depth === 0) return raw.slice(start, j + 1)
    }
  }
  return ''
}

/** Value of the first of `names` as a `| name = value` line of one template, without comments. */
function templateParam(body: string, names: string[]): string {
  for (const name of names) {
    const m = new RegExp(`^\\s*\\|\\s*${escapeRegExp(name)}\\s*=([^\\n]*)`, 'imu').exec(body)
    const value = m?.[1]?.replace(/<!--[\s\S]*?-->/g, '').trim()
    if (value) return value
  }
  return ''
}

/**
 * Engines written as ru / uk `{{Двигатель | наименование = 2,0 L MZR l4 | объём = 2000 | мощность = 114 | мощность лс = 147 …}}`
 * templates (the parameter `мощность` is kW). One engine per template; [] when the field holds none.
 */
export function engineTemplates(raw: string): WikiEngine[] {
  const out: WikiEngine[] = []
  for (let i = 0; i < raw.length - 1; i++) {
    if (raw.slice(i, i + 2) !== '{{') continue
    const body = templateAt(raw, i)
    if (!body) break
    i += body.length - 1
    if (!ENGINE_TEMPLATE.test(body)) continue
    const name = expandWikitext(templateParam(body, ['наименование', 'назва'])).join(' ')
    const base = parseEngine(name)
    const number = (names: string[]): number => Number(templateParam(body, names).replace(',', '.'))
    const cc = number(['объём', "об'єм", 'об’єм'])
    const kw = number(['мощность', 'потужність'])
    const hp = number(['мощность лс', 'потужність кс'])
    const fuelText = `${name} ${templateParam(body, ['рекомендованное топливо', 'рекомендоване паливо'])}`
    const fuel = base.fuel ?? (DIESEL_WORD.test(fuelText) ? 'diesel' : PETROL_WORD.test(fuelText) ? 'petrol' : null)
    const cylinders = number(['цилиндров', 'циліндрів']) || base.cylinders
    out.push({
      displacementCc:
        cc >= 40 && cc <= 20000 ? Math.round(cc) : cc > 0 && cc < 20 ? Math.round(cc * 1000) : base.displacementCc,
      cylinders: cylinders && cylinders <= 16 ? cylinders : null,
      powerKw: kw >= 5 && kw <= 1500 ? Math.round(kw) : hp >= 5 && hp <= 2000 ? Math.round(hp * 0.7355) : base.powerKw,
      fuel,
      raw: name || body.slice(0, 80)
    })
  }
  return out
}

const codeKey = (s: string): string => s.toLowerCase().replace(/[^\p{L}\d]+/gu, '')

export type ParseOptions = {
  /** Wikipedia edition of the text ('en', 'ru' …): decides whether bare numbers are accepted as mm / kg / litres. */
  lang?: string
  /** Generation code (XV70, Mk7): picks the matching per-generation sub-block of a model article (ru "Модификация автомобиля"). */
  code?: string
  /**
   * The article is a series article (one page for several generations: Qashqai, Tucson …): its body tables are used only
   * when a heading above them matches `code`, never as a whole.
   */
  series?: boolean
  /**
   * First production year of the generation: an article with one infobox per generation (ru `{{Автомобиль}}` under each "Поколение"
   * heading) gives the block whose production start is within a year of it.
   */
  yearFrom?: number
  /** false = infobox only (the probe compares both); default true. */
  tables?: boolean
}

const TABLE_DIM: Record<keyof WikiSpecs['rawOnly'], keyof TableSpecs['dims']> = {
  wheelbase: 'wheelbase',
  length: 'length',
  width: 'width',
  height: 'height',
  weight: 'weight',
  fuel_capacity: 'tank'
}

const engineKey = (e: WikiEngine): string =>
  [e.displacementCc, e.powerKw, e.powerKwMax, e.fuel, e.chassisCodes?.join('+'), e.engineCodes?.join('+')].join('|')

/** Engines and dimensions of the article's body tables that belong to the generation (see `ParseOptions.series`). */
function articleTables(wikitext: string, opts: ParseOptions): TableSpecs {
  const all = parseWikiTables(wikitext).map(t => ({
    headings: t.headings,
    byYear: !!modelYearColumns(t),
    specs: tableSpecs(t, opts.yearFrom)
  }))
  const code = opts.code ? codeKey(opts.code) : ''
  const matched = code ? all.filter(t => t.headings.some(h => codeKey(h).includes(code))) : []
  const base = matched.length > 0 ? matched : opts.series ? [] : all
  // A model-year table picks its column by `yearFrom`, so a series article needs no heading to select it.
  const used = [...new Set([...base, ...all.filter(t => t.byYear)])]
  const out: TableSpecs = { engines: [], dims: {} }
  const seen = new Set<string>()
  for (const { specs } of used) {
    for (const e of specs.engines) {
      if (seen.has(engineKey(e))) continue
      seen.add(engineKey(e))
      out.engines.push(e)
    }
    for (const kind of Object.keys(specs.dims) as (keyof TableSpecs['dims'])[])
      addDim(out.dims, kind, specs.dims[kind]!)
  }
  return out
}

/** All spec fields of one article's infobox (the sub-block of `opts.code` when the article has one, else the main one). */
export function parseWikiSpecs(wikitext: string, opts: ParseOptions = {}): WikiSpecs {
  const blocks = infoboxBlocks(wikitext)
  const code = opts.code ? codeKey(opts.code) : ''
  const sub = code
    ? blocks.find(b => SUB_NAME.test(b.name) && codeKey(blockField(b.text, ALIASES.name)).includes(code))
    : undefined
  const mains = blocks.filter(b => !SUB_NAME.test(b.name))
  const main = sub ?? blockByYear(mains, opts.yearFrom) ?? mains[0]
  const allowBare = BARE_NUMBER_LANGS.has(opts.lang ?? 'en')
  const field = (a: Alias): string[] => (main ? expandWikitext(blockField(main.text, ALIASES[a])) : [])
  const rawOnly: WikiSpecs['rawOnly'] = {}
  const tables = opts.tables === false ? { engines: [], dims: {} } : articleTables(wikitext, opts)
  const measure = (
    name: keyof WikiSpecs['rawOnly'],
    kind: 'length' | 'mass' | 'volume',
    bounds: readonly [number, number]
  ): Measure | null => {
    const lines = field(name)
    const parsed = parseMeasure(lines, kind, bounds, allowBare)
    if (parsed) return parsed
    // The infobox is empty or ambiguous: the body tables may state it (the infobox wins when it parses).
    const tableLines = tables.dims[TABLE_DIM[name]] ?? []
    const fromTable = parseMeasure(tableLines, kind, bounds, allowBare)
    const raw = lines.length > 0 ? lines : tableLines
    if (!fromTable && raw.length > 0) rawOnly[name] = raw.join(' / ').slice(0, 300)
    return fromTable
  }
  const templateEngines = main ? engineTemplates(blockField(main.text, ALIASES.engine)) : []
  const infoboxEngines = (templateEngines.length > 0 ? templateEngines : field('engine').map(parseEngine)).filter(
    e => e.displacementCc !== null || e.powerKw !== null
  )
  // Motorcycle infoboxes keep the power in its own field ("55 kW @ 9,000 rpm"): a lone engine without a figure takes the first one.
  const bikeKw =
    infoboxEngines.length === 1 && infoboxEngines[0]!.powerKw === null
      ? (field('power').map(powerKwOf).find(Boolean) ?? null)
      : null
  if (bikeKw) infoboxEngines[0] = { ...infoboxEngines[0]!, powerKw: bikeKw }
  // German motorcycle infoboxes keep `Hubraum` (cm³) and `Leistung` ("88/120 bei 9000": kW/PS) apart from the engine text.
  if (infoboxEngines.length === 0) {
    const cc = Number(
      field('de_displacement')
        .join(' ')
        .replace(/\s/g, '')
        .replace(',', '.')
        .match(/^\d+(?:\.\d)?/)?.[0]
    )
    const power = field('de_power').join(' ')
    const kw = /^(\d{2,4})\s*\/\s*\d{2,4}(?!\d)/.exec(power)?.[1]
    if (cc >= 40 && cc <= 20000)
      infoboxEngines.push({
        displacementCc: Math.round(cc),
        cylinders: null,
        powerKw: kw ? Number(kw) : powerKwOf(power),
        fuel: null,
        raw: `${cc} cm³ ${power}`.trim()
      })
  }
  // Table rows carry power, chassis codes and notes; infobox lines rarely do — tables win when they have a figure,
  // unless they name no engine at all (a per-variant power table has neither displacement nor engine code) while the
  // infobox already states a power; an infobox without any power loses to the table's figures.
  const infoboxHasPower = infoboxEngines.some(e => e.powerKw !== null)
  const tableNamesEngine = tables.engines.some(e => e.displacementCc !== null || (e.engineCodes?.length ?? 0) > 0)
  // A table sharing no displacement with the infobox lists other vehicles (a competitor comparison): the infobox wins.
  const infoboxCc = infoboxEngines.flatMap(e => (e.displacementCc === null ? [] : [e.displacementCc]))
  const tableContradicts =
    infoboxCc.length > 0 &&
    tables.engines.every(e => e.displacementCc !== null) &&
    !tables.engines.some(e => infoboxCc.some(cc => Math.abs(cc - e.displacementCc!) <= cc * 0.03))
  const engines =
    infoboxEngines.length === 0 ||
    (tables.engines.some(e => e.powerKw !== null) && (tableNamesEngine || !infoboxHasPower) && !tableContradicts)
      ? tables.engines
      : infoboxEngines
  return {
    wheelbaseMm: measure('wheelbase', 'length', WIKI_SPEC_BOUNDS.wheelbaseMm),
    lengthMm: measure('length', 'length', WIKI_SPEC_BOUNDS.lengthMm),
    widthMm: measure('width', 'length', WIKI_SPEC_BOUNDS.widthMm),
    heightMm: measure('height', 'length', WIKI_SPEC_BOUNDS.heightMm),
    kerbKg: measure('weight', 'mass', WIKI_SPEC_BOUNDS.kerbKg),
    fuelTankL: measure('fuel_capacity', 'volume', WIKI_SPEC_BOUNDS.fuelTankL),
    layout: field('layout').join('; ').slice(0, 200),
    transmission: field('transmission').join('; ').slice(0, 300),
    engines,
    rawOnly
  }
}

// ── Body wikitables ("Engines" / "Powertrain" / "Specifications") ────────────────────────────────────────────────

/** One table cell as plain lines (`expandWikitext`); `<br>` and list items are separate lines. */
type Cell = string[]

export type WikiTable = {
  /** Heading path, outermost first ("Sedan/coupe (FB1–6; 2011)", "Powertrain"). */
  headings: string[]
  /** The header row, each cell flattened to one line; [] when the table has none. */
  header: string[]
  rows: Cell[][]
  /** A rowspan / colspan was expanded (the value is repeated into the covered cells). */
  merged: boolean
}

/** Splits on any of `seps` outside `{{ }}` and `[[ ]]`. */
function splitTop(text: string, seps: readonly string[]): string[] {
  const out: string[] = []
  let depth = 0
  let last = 0
  for (let i = 0; i < text.length; i++) {
    const two = text.slice(i, i + 2)
    if (two === '{{' || two === '[[') {
      depth++
      i++
    } else if (two === '}}' || two === ']]') {
      depth = Math.max(0, depth - 1)
      i++
    } else if (depth === 0 && seps.includes(two)) {
      out.push(text.slice(last, i))
      last = i + 2
      i++
    }
  }
  out.push(text.slice(last))
  return out
}

const CELL_ATTRS = /^\s*(?:[\w-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"']+)\s*)+$/

/** `style="x" rowspan=2 | text` → attributes + text; a single `|` outside templates / links separates them. */
function splitCellAttrs(s: string): { attrs: string; body: string } {
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2)
    if (two === '{{' || two === '[[') {
      depth++
      i++
    } else if (two === '}}' || two === ']]') {
      depth = Math.max(0, depth - 1)
      i++
    } else if (depth === 0 && s[i] === '|') {
      // Real attributes look like `key=value`; a stray pipe in prose does not.
      if (CELL_ATTRS.test(s.slice(0, i))) return { attrs: s.slice(0, i), body: s.slice(i + 1) }
      break
    }
  }
  return { attrs: '', body: s }
}

function spanOf(attrs: string, name: 'rowspan' | 'colspan'): number {
  const n = Number(new RegExp(`${name}\\s*=\\s*["']?(\\d+)`, 'i').exec(attrs)?.[1] ?? 1)
  return n >= 1 && n <= 50 ? n : 1
}

function headingOf(line: string): { level: number; text: string } | null {
  const m = /^(={2,6})\s*(.*?)\s*\1\s*$/.exec(line)
  return m ? { level: m[1]!.length, text: expandWikitext(m[2]!).join(' ') } : null
}

type RawCell = { attrs: string; body: string; header: boolean }

/** Spans expanded: a rowspan cell re-enters the following rows at its column, a colspan cell repeats. */
function expandSpans(rawRows: RawCell[][]): { cells: Cell[]; header: boolean[]; merged: boolean }[] {
  const carry = new Map<number, { cell: Cell; left: number }>()
  const grid: { cells: Cell[]; header: boolean[]; merged: boolean }[] = []
  for (const row of rawRows) {
    if (row.length === 0) continue
    const cells: Cell[] = []
    const header: boolean[] = []
    let merged = false
    const fillCarry = (): void => {
      for (let c = carry.get(cells.length); c; c = carry.get(cells.length)) {
        const at = cells.length
        cells.push(c.cell)
        header.push(false)
        merged = true
        if (--c.left <= 0) carry.delete(at)
      }
    }
    for (const rc of row) {
      fillCarry()
      const cell = expandWikitext(rc.body)
      const cs = spanOf(rc.attrs, 'colspan')
      const rs = spanOf(rc.attrs, 'rowspan')
      if (cs > 1 || rs > 1) merged = true
      for (let k = 0; k < cs; k++) {
        if (rs > 1) carry.set(cells.length, { cell, left: rs - 1 })
        cells.push(cell)
        header.push(rc.header)
      }
    }
    fillCarry()
    grid.push({ cells, header, merged })
  }
  return grid
}

/** Every top-level wikitable of the page (a nested table stays inside its cell as text), with the heading path above it. */
export function parseWikiTables(wikitext: string): WikiTable[] {
  const tables: WikiTable[] = []
  const headingStack: { level: number; text: string }[] = []
  let depth = 0
  let rawRows: RawCell[][] = []
  let tableHeadings: string[] = []
  let cur: RawCell | null = null

  const flush = (): void => {
    const grid = expandSpans(rawRows)
    // Header = the first row of ≥2 distinct header cells within the first two rows (a lone "Petrol engines" title is skipped).
    const hi = grid.findIndex(r => r.header.every(Boolean) && new Set(r.cells.map(c => c.join(' '))).size >= 2)
    // Some tables write the header with `|` cells: take a leading row where ≥2 cells read as known columns.
    const guess = grid
      .slice(0, 3)
      .findIndex(r => new Set(r.cells.map(c => c.join(' ')).filter(c => columnKind(c) !== null)).size >= 2)
    const at = hi >= 0 && hi <= 1 ? hi : guess
    tables.push({
      headings: tableHeadings,
      header: at >= 0 ? grid[at]!.cells.map(c => c.join(' ')) : [],
      rows: grid.slice(at >= 0 ? at + 1 : 0).map(r => r.cells),
      merged: grid.some(r => r.merged)
    })
  }

  for (const line of wikitext.split('\n')) {
    if (depth === 0) {
      const h = headingOf(line)
      if (h) {
        while (headingStack.length > 0 && headingStack.at(-1)!.level >= h.level) headingStack.pop()
        headingStack.push(h)
        continue
      }
    }
    if (line.startsWith('{|')) {
      depth++
      if (depth === 1) {
        rawRows = []
        cur = null
        tableHeadings = headingStack.map(x => x.text)
        continue
      }
    } else if (line.startsWith('|}') && depth > 0) {
      depth--
      if (depth === 0) {
        flush()
        continue
      }
    }
    if (depth === 0) continue
    if (depth > 1) {
      if (cur) cur.body += `\n${line}`
      continue
    }
    if (line.startsWith('|-')) {
      rawRows.push([])
      cur = null
    } else if (line.startsWith('|+')) {
      cur = null
    } else if (/^[|!]/.test(line)) {
      if (rawRows.length === 0) rawRows.push([])
      const header = line.startsWith('!')
      for (const part of splitTop(line.slice(1), header ? ['!!', '||'] : ['||'])) {
        cur = { ...splitCellAttrs(part), header }
        rawRows.at(-1)!.push(cur)
      }
    } else if (cur) {
      cur.body += `\n${line}`
    }
  }
  return tables
}

type ColumnKind =
  'engine' | 'displacement' | 'cylinders' | 'power' | 'fuel' | 'engineCode' | 'chassisCode' | 'code' | 'years' | DimKind

/**
 * Header / row-label patterns (en, ru, uk, de); first match wins, so "Engine code" is `engineCode`, not `engine`. The code
 * column splits by what its header names: engine codes, chassis / model codes, else the ambiguous `code` ("Code", "Type/code").
 */
const COLUMN_KINDS: [ColumnKind, RegExp][] = [
  [
    'engineCode',
    /engine (?:code|id)|engine family|motor\W*(?:baureihe|code|kenn)|motor\W*\*?\s*\(code\)|kód motoru|код (?:двиг|мотор)|(?:двигун|двигатель)\s*\(код\)|маркировка двигателя|буквенный код/i
  ],
  ['chassisCode', /chassis|кузов|шасси|baureihe|model\s?code|body code/i],
  ['code', /\bcode\b/i],
  ['tank', /fuel (?:tank|capacity)/i],
  ['displacement', /displacement|capacity|volume|объ[её]м|об'єм|hubraum|swept/i],
  ['cylinders', /cylinders|цилиндр|циліндр|zylinder/i],
  ['power', /power|output|horsepower|\bhp\b|\bps\b|\bkw\b|мощност|потужн|leistung/i],
  ['fuel', /^fuel$|fuel type|^топливо$|^паливо$|^тип топлива|^kraftstoff$|kraftstoffart/i],
  ['years', /years?\b|production|period|годы|период|роки|bauzeit|baujahr|выпуск/i],
  ['tank', /fuel (?:tank|capacity)|объ[её]м бака|об'єм бака|^бак|tankinhalt|tank/i],
  ['wheelbase', /wheelbase|колёсная база|колесная база|колісна база|radstand|empattement/i],
  ['length', /^(?:overall |body )?length|^длина|^довжина|^länge/i],
  ['width', /^(?:overall |body )?width|^ширина|^breite/i],
  ['height', /^(?:overall |body )?height|^высота|^висота|^höhe/i],
  ['weight', /weight|масса|вага|leergewicht|gewicht/i],
  // Last: a bare name column ("Engine", "Model", "Двигатель", "Тип").
  ['engine', /engine|model|motor|двигат|двигун|название|назва|модель|тип\b|type\b|modell/i]
]

function columnKind(label: string): ColumnKind | null {
  const text = label.replace(/\s+/g, ' ').trim()
  // Charging power ("Ladeleistung", "Charging power") is not the engine's.
  if (/charg|lade|заряд/i.test(text)) return null
  // "Power<br>Torque" is still the power column; a pure torque column is nothing.
  if (/torque|крутящ|крутн|drehmoment/i.test(text) && !/power|мощност|потужн|leistung/i.test(text)) return null
  return COLUMN_KINDS.find(([, re]) => re.test(text))?.[0] ?? null
}

type DimKind = 'wheelbase' | 'length' | 'width' | 'height' | 'weight' | 'tank'
const isDimKind = (k: ColumnKind | null): k is DimKind =>
  k === 'wheelbase' || k === 'length' || k === 'width' || k === 'height' || k === 'weight' || k === 'tank'

/** Power of a cell: one value when its lines agree (kW and PS of the same engine), else the min–max across lines. */
function cellPower(lines: string[]): { kw: number | null; max: number | null } {
  const vals = lines.map(powerKwOf).filter((v): v is number => v !== null)
  if (vals.length === 0) return { kw: null, max: null }
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  if (hi - lo <= hi * 0.03) return { kw: vals[0]!, max: null }
  return { kw: lo, max: hi }
}

/** Gearbox / phase words (`5-speed`, `3-phase`) a loose "Code" column carries; not codes of any kind. */
export const GEARBOX_WORD = /^\d-(?:speed|phase)$/i

/** Codes such as `FK1`, `FB7` out of "FK1 (Hatchback) / FB7 (Sedan, Europe)"; the parenthesised words are the note. */
function chassisOf(lines: string[], engine = false): { codes: string[]; note: string } {
  const notes: string[] = []
  const codes: string[] = []
  // Split on commas outside parentheses only: "FB7 (Sedan, Europe)" is one entry.
  for (const part of lines.join(' / ').split(/\s*[/;]\s*|,(?![^(]*\))/)) {
    // An engine-code column also writes "OM 607" with a space and all-caps codes without a digit ("CJZA"); its header
    // already said what the cell is.
    const spaced = engine ? /^\s*([A-Z]{1,3} \d{2,4}[A-Z0-9-]*)(?![\w-])/.exec(part) : null
    const m = spaced ?? /^\s*([A-Z0-9][A-Za-z0-9-]{1,9})\b\s*(?:\(([^)]*)\))?/.exec(part)
    // A full Japanese model code ("E-VZJ95W-GKPGK") is cut at 10 characters and may end on its hyphen.
    const code = m?.[1]?.replace(/-+$/, '')
    if (
      m &&
      code &&
      !/^\d+$/.test(code) &&
      !GEARBOX_WORD.test(code) &&
      (/\d/.test(code) || (engine && /^[A-Z]{3,}$/.test(code)))
    ) {
      codes.push(code)
      if (m[2]) notes.push(m[2])
    }
  }
  return { codes, note: notes.join('; ') }
}

/** Displacement from a cell without a unit of its own: the header's unit decides (`Об'єм [см³]`, `Hubraum (cm³)`, `Displacement (L)`). */
function bareDisplacement(value: string, header: string): number | null {
  const m = /^\s*(\d[\d\s.,]*)\s*$/.exec(value)
  if (!m) return null
  const n = Number(
    m[1]!
      .replace(/\s/g, '')
      .replace(/,(\d{3})$/, '$1')
      .replace(',', '.')
  )
  if (!Number.isFinite(n)) return null
  if (/cm|см|cc/i.test(header) && n >= 40 && n <= 20000) return Math.round(n)
  if (/(?<![\p{L}])(?:l|litres?|liters?|л)(?![\p{L}])/iu.test(header) && n >= 0.05 && n <= 20)
    return Math.round(n * 1000)
  return null
}

/**
 * Power cells that carry a bare number ("55/74/75" under "Мощность, кВт/bhp/PS", "83/5700" under "л. с./об/мин"): the first
 * unit of the header goes with the first number. Cells that name their own unit are left alone.
 */
function powerLines(cell: Cell, header: string): string[] {
  if (cell.some(l => powerKwOf(l) !== null)) return cell
  const unit = /кВт|kW|л\.\s?с\.?|bhp|hp|PS|CV/i.exec(header)?.[0]
  if (!unit) return cell
  return cell.map(l => {
    const n = /^\s*(\d{2,4})(?![\d.,])/.exec(l)?.[1]
    return n ? `${n} ${unit}` : l
  })
}

type EngineParts = {
  engine: string[]
  displacement: { lines: string[]; header: string }[]
  cylinders: string[]
  power: string[]
  fuel: string[]
  engineCode: string[]
  chassisCode: string[]
  code: string[]
  years: string[]
  /** The table's header named its code column(s): `engineCodes` is then reliable, even when empty. */
  named: boolean
}

const emptyParts = (): EngineParts => ({
  engine: [],
  displacement: [],
  cylinders: [],
  power: [],
  fuel: [],
  engineCode: [],
  chassisCode: [],
  code: [],
  years: [],
  named: false
})

function engineOf(p: EngineParts): WikiEngine | null {
  const text = [p.engine.join(' '), p.displacement.map(d => d.lines.join(' ')).join(' '), p.fuel.join(' ')]
    .filter(Boolean)
    .join(' ')
  const parsed = parseEngine(text)
  let displacementCc = parsed.displacementCc
  if (displacementCc === null) {
    for (const d of p.displacement) displacementCc ??= bareDisplacement(d.lines.join(' '), d.header)
    // A leading "1.3" / "1,6" of an engine cell is litres ("1,3 (70 л. с.)").
    const lead = /^\s*(\d[.,]\d)(?![\d.,])(?!\s*(?:kW|hp|PS|кВт))/i.exec(p.engine.join(' '))
    if (displacementCc === null && lead) displacementCc = Math.round(Number(lead[1]!.replace(',', '.')) * 1000)
    if (displacementCc !== null && (displacementCc < 40 || displacementCc > 20000)) displacementCc = null
  }
  let cylinders = parsed.cylinders
  if (cylinders === null) {
    // "4", "4-цил./16-кл.", "4 cyl."
    const n = Number(/^\s*(\d{1,2})(?:\s*[-–]?\s*(?:цил|cyl|zyl)\S*)?(?![\d.,])/i.exec(p.cylinders.join(' '))?.[1])
    if (n >= 1 && n <= 16) cylinders = n
  }
  const power = cellPower(p.power)
  const powerKw = power.kw ?? parsed.powerKw
  if (displacementCc === null && powerKw === null) return null
  const { codes, note } = chassisOf([...p.chassisCode, ...p.code])
  const engineCodes = chassisOf(p.engineCode, true).codes
  let fuel = parsed.fuel
  // "Natural Gas Sedan" in the chassis column: a CNG variant of a petrol engine.
  if ((fuel === null || fuel === 'petrol') && /natural gas|\bcng\b|\blpg\b|метан|пропан|erdgas/i.test(note))
    fuel = 'lpg'
  return {
    displacementCc,
    cylinders,
    powerKw,
    fuel,
    raw: `${text} ${p.power.join(' ')}`.replace(/\s+/g, ' ').trim().slice(0, 300),
    powerKwMax: power.max,
    chassisCodes: codes,
    ...(p.named ? { engineCodes } : {}),
    note,
    years: p.years.join(' ').slice(0, 60)
  }
}

export type TableSpecs = {
  engines: WikiEngine[]
  /** Raw lines per dimension, one entry per variant row / column; fed to `parseMeasure` ("one unambiguous value or null"). */
  dims: Partial<Record<DimKind, string[]>>
}

function addDim(out: TableSpecs['dims'], kind: DimKind, lines: string[]): void {
  if (lines.length > 0) (out[kind] ??= []).push(...lines)
}

/** `1999–2002` / `2003` / `2017–present` → [from, to]; null for anything else. */
function yearSpan(label: string): [number, number] | null {
  const m = /^\s*(\d{4})\s*(?:[–—-]\s*(\d{4}|present|now)?\s*)?$/i.exec(label)
  if (!m) return null
  const from = Number(m[1])
  const open = !m[2] ? /[–—-]/.test(m[0]) : !/^\d/.test(m[2])
  return [from, open ? Infinity : Number(m[2] ?? from)]
}

/** The year range of each column of a model-year table (`Model year | 1999–2002 | 2003 …`); null for any other table. */
export function modelYearColumns(table: WikiTable): ([number, number] | null)[] | null {
  const spans = table.header.slice(1).map(yearSpan)
  return columnKind(table.header[0] ?? '') === 'years' && spans.filter(Boolean).length >= 2 ? spans : null
}

/**
 * Model-year table (`Model year | 1999–2002 | 2003 …`, a row per attribute): only the column whose range holds `yearFrom` counts,
 * its first line per cell (the base model before the "S / A" variants). Colspan merges were expanded already; a missing or
 * empty cell is no value.
 */
function modelYearSpecs(
  table: WikiTable,
  spans: ([number, number] | null)[],
  yearFrom: number | undefined
): TableSpecs {
  const out: TableSpecs = { engines: [], dims: {} }
  const col = spans.findIndex(s => !!s && yearFrom !== undefined && yearFrom >= s[0] && yearFrom <= s[1])
  if (col < 0) return out
  const parts = emptyParts()
  for (const row of table.rows) {
    // A section title ("Engine", "Dimensions") fills the row with one text.
    if (new Set(row.map(c => c.join(' ')).filter(Boolean)).size < 2) continue
    const label = row[0]!.join(' ')
    const kind = columnKind(label)
    const value = row[col + 1]?.slice(0, 1) ?? []
    if (!kind || value.length === 0) continue
    if (isDimKind(kind)) {
      if (!(kind === 'weight' && /dry/i.test(label))) addDim(out.dims, kind, value)
    } else if (kind === 'power' || kind === 'cylinders' || kind === 'fuel') parts[kind].push(...value)
    else if (kind === 'engine' && /engine/i.test(label)) parts.engine.push(...value)
    else if (kind === 'displacement' && /displacement/i.test(label))
      parts.displacement.push({ lines: value, header: label })
  }
  const e = engineOf(parts)
  if (e) out.engines.push(e)
  return out
}

/**
 * Engines and dimensions out of one table. Three layouts: a row per engine / variant (columns classified by the header), a
 * column per engine with the parameter names down the first column (`Wheelbase | 2700 | 2700` — de / ru technical data), and
 * a column per model-year range (`Model year | 1999–2002 | 2003`, motorcycles; needs `yearFrom`).
 */
export function tableSpecs(table: WikiTable, yearFrom?: number): TableSpecs {
  const out: TableSpecs = { engines: [], dims: {} }
  const spans = modelYearColumns(table)
  if (spans) return modelYearSpecs(table, spans, yearFrom)
  const kinds = table.header.map(columnKind)
  // ≥2 distinct recognised columns = a row per engine; a lone label in the corner ("Двигатель | 1,3 | 1,5") = a column per engine.
  const byRow = new Set(kinds.filter(k => k !== null)).size >= 2
  const named = kinds.some(k => k === 'engineCode' || k === 'chassisCode')

  if (byRow) {
    let groupFuel: WikiEngine['fuel'] = null
    for (const row of table.rows) {
      // A group title row ("Petrol:") has one distinct cell.
      const distinct = new Set(row.map(c => c.join(' ')).filter(Boolean))
      if (distinct.size < 2) {
        // "Бензиновые" / "Diesel engines": the fuel of the rows below, when they do not say it themselves.
        groupFuel = FUELS.find(([re]) => re.test([...distinct].join(' ')))?.[1] ?? null
        continue
      }
      const parts = emptyParts()
      parts.named = named
      row.forEach((cell, i) => {
        const kind = kinds[i]
        if (!kind || cell.length === 0) return
        if (isDimKind(kind)) addDim(out.dims, kind, cell)
        else if (kind === 'displacement') parts.displacement.push({ lines: cell, header: table.header[i] ?? '' })
        else if (kind === 'power') parts.power.push(...powerLines(cell, table.header[i] ?? ''))
        else parts[kind].push(...cell)
      })
      const e = engineOf(parts)
      if (e) out.engines.push({ ...e, fuel: e.fuel ?? groupFuel })
    }
    return out
  }

  // Column per engine: every row is `label | value | value …` (the header row too, when its first cell is a label).
  const all: Cell[][] = table.header.length > 0 ? [table.header.map(h => [h]), ...table.rows] : table.rows
  const labelled = all.map(r => ({
    kind: columnKind(r[0]?.join(' ') ?? ''),
    label: r[0]?.join(' ') ?? '',
    values: r.slice(1)
  }))
  if (labelled.filter(r => r.kind !== null).length < 2) return out
  const width = Math.max(0, ...labelled.map(r => r.values.length))
  const columns: EngineParts[] = Array.from({ length: width }, emptyParts)
  const namedRows = labelled.some(r => r.kind === 'engineCode' || r.kind === 'chassisCode')
  for (const c of columns) c.named = namedRows
  for (const { kind, label, values } of labelled) {
    if (!kind) continue
    if (isDimKind(kind)) {
      for (const v of values) addDim(out.dims, kind, v)
      continue
    }
    values.forEach((cell, j) => {
      if (cell.length === 0) return
      if (kind === 'displacement') columns[j]!.displacement.push({ lines: cell, header: label })
      else if (kind === 'power') columns[j]!.power.push(...powerLines(cell, label))
      else columns[j]![kind].push(...cell)
    })
  }
  // The header row names the engines ("1.0 TSI", "GTI") when its first cell is only a corner label.
  if (table.header.length > 0 && kinds[0] === null)
    table.header.slice(1).forEach((h, j) => columns[j]?.engine.unshift(h))
  for (const parts of columns) {
    const e = engineOf(parts)
    if (e) out.engines.push(e)
  }
  return out
}
