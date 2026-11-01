import type { AuctionLotInsert } from '@carplates/db'
import { denormalizePlate, isSovietPlate, isUaPlate, isVin, normalizePlate } from '@carplates/shared'
import { parse } from 'csv-parse/sync'
import { z } from 'zod'

import { organUnitRegion } from './wanted-parse.js'

/** The only SETAM categories that hold cars (boats, trailers, farm machinery … have no plate / VIN worth matching). */
export const VEHICLE_CATEGORIES = ['Легкові автомобілі', 'Вантажні автомобілі'] as const

/**
 * CSV column header → field. Header-name-driven like `transform.ts`: older files have 8 columns, newer ones add the proceeding
 * number, and 2021-04 … 2023-02 spell it `Проовадження`. The winner column (`Переможець`) is deliberately absent: never read.
 */
const HEADER_FIELDS: readonly (readonly [RegExp, keyof AuctionCsvCells])[] = [
  [/^назва$/i, 'title'],
  [/^стан$/i, 'status'],
  [/^категорія$/i, 'category'],
  [/^місцезнаходження$/i, 'location'],
  [/^номер лота$/i, 'lotNo'],
  [/^стартова ціна$/i, 'startPrice'],
  [/^ціна продажу$/i, 'salePrice'],
  [/^про+вадження$/i, 'proceeding']
]

/** One CSV record by field. Only the four identifying fields are required. */
export const AuctionCsvCellsSchema = z.object({
  title: z.string().trim().min(1),
  status: z.string().trim().min(1),
  category: z.string().trim().min(1),
  location: z.string().nullish(),
  lotNo: z.coerce.number().int().positive(),
  startPrice: z.string().nullish(),
  salePrice: z.string().nullish(),
  proceeding: z.string().nullish()
})
export type AuctionCsvCells = z.infer<typeof AuctionCsvCellsSchema>

const REQUIRED_FIELDS: readonly (keyof AuctionCsvCells)[] = ['title', 'status', 'category', 'lotNo']

/** Column index per field; throws when a required column is missing (a renamed header must not yield zero rows silently). */
export function auctionLayout(headerCells: string[]): Partial<Record<keyof AuctionCsvCells, number>> {
  const layout: Partial<Record<keyof AuctionCsvCells, number>> = {}
  headerCells.forEach((raw, idx) => {
    const cell = raw.replace(/^\uFEFF/, '').trim()
    const hit = HEADER_FIELDS.find(([re]) => re.test(cell))
    if (hit) layout[hit[1]] = idx
  })
  const missing = REQUIRED_FIELDS.filter(f => layout[f] === undefined)
  if (missing.length > 0) {
    throw new Error(`auctions CSV: missing column(s) ${missing.join(', ')} in header: ${headerCells.join(';')}`)
  }
  return layout
}

/** `192305.00` → 192305; empty, `0.00` (not sold) or garbage → null. */
export function lotPrice(v: string | null | undefined): number | null {
  const n = Number(v?.trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Location (`м.Київ`, `Вінницька обл.`) → the same region names as the plate / police-unit regions. */
export function lotRegion(location: string | null | undefined): string | null {
  const loc = location?.trim()
  if (!loc) return null
  if (/^м\.?\s*київ/i.test(loc)) return 'Київ'
  return organUnitRegion(loc)
}

// ---------------------------------------------------------------------------------------------------------------------
// Title parsing. The title is free text typed by the bailiff: "Транспортний засіб SUBARU FORESTER, 2007 року випуску,
// № кузова: JF1SG5LE58G145231, ДНЗ: АА 2335 ЕТ". Labels, order and spelling vary, VINs carry Cyrillic look-alikes,
// plates can be foreign or Soviet-era. Every field is null unless it is recognised with confidence.
// ---------------------------------------------------------------------------------------------------------------------

const ALNUM = '\\p{L}\\d'

const VIN_TOKEN_RE = new RegExp(`(?<![${ALNUM}])[${ALNUM}]{17}(?![${ALNUM}])`, 'gu')

/** A 17-char token that is a VIN once Cyrillic look-alikes are folded to Latin and the letters O / I / Q (never in a VIN) fixed. */
function vinFromToken(token: string): string | null {
  const vin = denormalizePlate(token).replace(/[OQ]/g, '0').replace(/I/g, '1')
  return isVin(vin) && /\d/.test(vin) ? vin : null
}

/** The first valid VIN in the title (the chassis / body number of older lots is not a VIN and is ignored). */
export function titleVin(title: string): string | null {
  for (const m of title.matchAll(VIN_TOKEN_RE)) {
    const vin = vinFromToken(m[0])
    if (vin) return vin
  }
  return null
}

/** "ДНЗ", "д.н.з.", "д/н", "р.н.", "реєстраційний номер", "держ. номер", "державний номерний знак", "номер державної реєстрації" … */
const PLATE_LABEL_RE = new RegExp(
  `(?<![${ALNUM}])(?:` +
    `д[./]?\\s?н\\.?(?:\\s?з\\.?)?(?![${ALNUM}])` +
    '|р[./]\\s?н\\.?' +
    '|(?:держ\\p{L}*\\.?|реєстраційн\\p{L}*)\\s+(?:номерн\\p{L}*\\s+знак\\p{L}*|номер\\p{L}*)' +
    '|номерн\\p{L}*\\s+знак\\p{L}*' +
    '|номер\\p{L}*\\s+державної\\s+реєстрації' +
    ')(?:\\s+республіки\\s+\\p{L}+)?',
  'giu'
)

// What may follow a label, tried in order: current series, dashed Soviet, digits + region letters, legacy, any other token.
const L2 = '[A-ZА-ЯІЇЄ]{2}'
const PLATE_VALUE_RES = [
  new RegExp(`^${L2}\\s?\\d{4}\\s?${L2}`, 'iu'),
  /^\d{2,3}-\d{2}\s?[А-ЯІЇЄ]{2,3}/iu,
  /^\d{4,5}\s?[А-ЯІЇЄ]{2,3}/iu,
  new RegExp(`^\\d{2}\\s?${L2}\\s?\\d{4}`, 'iu'),
  /^[A-Z]{2,3}\s\d{3,4}/iu, // foreign, written with a space ("GEU 308")
  /^[A-ZА-ЯІЇЄ0-9]{5,10}/iu
]

/** After normalization a plate has letters and digits and a plausible length ("відсутній", "2007" are not plates). */
function plausiblePlate(plate: string): boolean {
  return plate.length >= 5 && plate.length <= 10 && /\d/.test(plate) && /[A-ZА-ЯІЇЄ]/.test(plate)
}

/** The plate that follows a label, or null. The value must end at a word boundary ("ДНЗ АО2649АЕ," yes, "ДНЗ АО2649АЕР" no). */
function labelledPlate(title: string): string | null {
  for (const label of title.matchAll(PLATE_LABEL_RE)) {
    const tail = title
      .slice(label.index + label[0].length, label.index + label[0].length + 30)
      .replace(/^[\s:№=.\-–]+/, '')
    for (const re of PLATE_VALUE_RES) {
      const m = re.exec(tail)
      if (!m || new RegExp(`^[${ALNUM}]`, 'u').test(tail.slice(m[0].length))) continue
      const plate = normalizePlate(m[0])
      if (plausiblePlate(plate)) return plate
    }
  }
  return null
}

const BARE_PLATE_RE = new RegExp(
  `(?<![${ALNUM}-])(?:${L2}\\s?\\d{4}\\s?${L2}|[А-ЯІЇЄ]\\d{4}[А-ЯІЇЄ]{2}|\\d{2,3}-\\d{2}\\s?[А-ЯІЇЄ]{2})(?![${ALNUM}])`,
  'giu'
)

/** A plate written without a label ("Opel VIVARO 2008 року випуску, АХ3201ЕС, кузов …"): current, Soviet-letter or dashed series. VINs are masked first. */
function bareUaPlate(title: string): string | null {
  const masked = title.replace(VIN_TOKEN_RE, ' ')
  for (const m of masked.matchAll(BARE_PLATE_RE)) {
    const plate = normalizePlate(m[0])
    if (isUaPlate(plate) || isSovietPlate(plate) || /^[А-ЯІЇЄ]\d{4}[А-ЯІЇЄ]{2}$/.test(plate)) return plate
  }
  return null
}

/** Normalized plate from the title (labelled value first, then a bare current-series plate), or null. */
export function titlePlate(title: string): string | null {
  return labelledPlate(title) ?? bareUaPlate(title)
}

const YEAR = '(19[3-9]\\d|20[0-3]\\d)'
const YEAR_RES = [
  new RegExp(`(?:випуску|виробництва|виготовлення)(?:\\s+тз)?\\s*[:\\-–]?\\s*${YEAR}(?!\\d)`, 'iu'),
  new RegExp(`(?<!\\d)${YEAR}\\s*(?:р\\.?\\s?в|року|рік|р\\.)`, 'iu')
]

/** Model year ("2007 року випуску", "1992 р.в.", "рік випуску: 2012"); null when absent or in the future. */
export function titleYear(title: string, now = new Date()): number | null {
  for (const re of YEAR_RES) {
    const m = re.exec(title)
    const year = m ? Number(m[1]) : NaN
    if (year <= now.getFullYear() + 1) return year
  }
  return null
}

/**
 * Makes seen in the lots: canonical name → spellings. Cyrillic-native makes stay Cyrillic (as in the registry). The longest
 * spelling is tried first, so "LAND ROVER" wins over "ROVER". Extend when the unparsed-make report shows a frequent miss.
 */
const MAKES: Readonly<Record<string, readonly string[]>> = {
  ACURA: ['ACURA'],
  'ALFA ROMEO': ['ALFA ROMEO', 'АЛЬФА РОМЕО'],
  'ASTON MARTIN': ['ASTON MARTIN'],
  AUDI: ['AUDI', 'АУДІ'],
  BENTLEY: ['BENTLEY'],
  BMW: ['BMW', 'БМВ'],
  BUICK: ['BUICK'],
  BYD: ['BYD'],
  CADILLAC: ['CADILLAC'],
  CHERY: ['CHERY', 'CHERRY'],
  CHEVROLET: ['CHEVROLET', 'CHEWROLET', 'CEVROLET', 'SHEVROLET', 'ШЕВРОЛЕ'],
  CHRYSLER: ['CHRYSLER', 'КРАЙСЛЕР'],
  CITROEN: ['CITROEN', 'CITROËN', 'СІТРОЕН', 'СІТРОЇН'],
  DACIA: ['DACIA'],
  DAEWOO: ['DAEWOO', 'ДЕУ'],
  DAF: ['DAF', 'ДАФ'],
  DAIHATSU: ['DAIHATSU'],
  DODGE: ['DODGE'],
  FAW: ['FAW'],
  FIAT: ['FIAT', 'ФІАТ'],
  FORD: ['FORD', 'ФОРД'],
  FOTON: ['FOTON'],
  FREIGHTLINER: ['FREIGHTLINER'],
  GEELY: ['GEELY', 'GELLY'],
  GMC: ['GMC'],
  'GREAT WALL': ['GREAT WALL'],
  HONDA: ['HONDA', 'ХОНДА'],
  HAFEI: ['HAFEI'],
  HUMMER: ['HUMMER'],
  HYUNDAI: ['HYUNDAI', 'HYNDAI', 'ХЕНДАЙ', 'ХЕНДЕ', 'ХУНДАЙ'],
  INFINITI: ['INFINITI'],
  ISUZU: ['ISUZU'],
  IVECO: ['IVECO', 'IVEKO', 'ІВЕКО'],
  JAC: ['JAC'],
  JAGUAR: ['JAGUAR'],
  JEEP: ['JEEP'],
  KENWORTH: ['KENWORTH'],
  KIA: ['KIA', 'КІА'],
  LADA: ['LADA'],
  LANCIA: ['LANCIA'],
  LDV: ['LDV'],
  'LAND ROVER': ['LAND ROVER', 'ЛЕНД РОВЕР'],
  LEXUS: ['LEXUS', 'LEXUX', 'ЛЕКСУС'],
  LIFAN: ['LIFAN'],
  LINCOLN: ['LINCOLN'],
  MACK: ['MACK'],
  MAN: ['MAN', 'МАН'],
  MAPLE: ['MAPLE'],
  MASERATI: ['MASERATI'],
  MAZDA: ['MAZDA', 'МАЗДА'],
  'MERCEDES-BENZ': [
    'MERCEDES-BENZ',
    'MERCEDES BENZ',
    'MERCEDES',
    'MERSEDES',
    'MERCEDENS-BENZ',
    'МЕРСЕДЕС-БЕНЦ',
    'МЕРСЕДЕС'
  ],
  MERCURY: ['MERCURY'],
  MG: ['MG'],
  MINI: ['MINI'],
  MITSUBISHI: ['MITSUBISHI', 'МІЦУБІСІ'],
  NISSAN: ['NISSAN', 'НІССАН'],
  OLDSMOBILE: ['OLDSMOBILE'],
  OPEL: ['OPEL', 'ОПЕЛЬ'],
  PEUGEOT: ['PEUGEOT', 'ПЕЖО'],
  PORSCHE: ['PORSCHE'],
  RAVON: ['RAVON'],
  RENAULT: ['RENAULT', 'RENAUT', 'РЕНО'],
  ROVER: ['ROVER'],
  SAAB: ['SAAB'],
  SCANIA: ['SCANIA', 'СКАНІЯ'],
  SEAT: ['SEAT'],
  SETRA: ['SETRA'],
  SHACMAN: ['SHACMAN'],
  SKODA: ['SKODA', 'SCODA', 'ŠKODA', 'ШКОДА'],
  SMART: ['SMART'],
  SAMAND: ['SAMAND'],
  SOUEAST: ['SOUEAST'],
  SSANGYONG: ['SSANGYONG', 'SSANG YONG'],
  SUBARU: ['SUBARU'],
  SUZUKI: ['SUZUKI'],
  TATRA: ['TATRA'],
  TEREX: ['TEREX'],
  TESLA: ['TESLA'],
  TOYOTA: ['TOYOTA', 'ТОЙОТА'],
  KARSAN: ['KARSAN'],
  TATA: ['TATA', 'ТАТА'],
  VOLKSWAGEN: ['VOLKSWAGEN', 'VOLKSVAGEN', 'VW', 'ФОЛЬКСВАГЕН'],
  VOLVO: ['VOLVO', 'ВОЛЬВО'],
  'ZHONG XING': ['ZHONG XING', 'ZHONGXING'],
  АЗЛК: ['АЗЛК'],
  БЕЛАЗ: ['БЕЛАЗ'],
  БОГДАН: ['БОГДАН'],
  ВАЗ: ['ВАЗ', 'VAZ'],
  ГАЗ: ['ГАЗ', 'GAZ'],
  ЗАЗ: ['ЗАЗ', 'ZAZ'],
  ЗИЛ: ['ЗИЛ', 'ЗІЛ', 'ZIL'],
  ІЖ: ['ІЖ', 'ИЖ'],
  КАМАЗ: ['КАМАЗ', 'KAMAZ'],
  КРАЗ: ['КРАЗ', 'KRAZ'],
  ЛАЗ: ['ЛАЗ'],
  ЛУАЗ: ['ЛУАЗ'],
  МАЗ: ['МАЗ', 'MAZ'],
  МОСКВИЧ: ['МОСКВИЧ'],
  РАФ: ['РАФ'],
  САЗ: ['САЗ'],
  ПАЗ: ['ПАЗ'],
  УАЗ: ['УАЗ', 'UAZ'],
  УРАЛ: ['УРАЛ']
}

const MAKE_BY_SPELLING = new Map(
  Object.entries(MAKES).flatMap(([make, spellings]) => spellings.map(s => [s.toUpperCase(), make] as const))
)
const MAKE_RE = new RegExp(
  `(?<![${ALNUM}])(${[...MAKE_BY_SPELLING.keys()]
    .sort((a, b) => b.length - a.length)
    .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'))
    .join('|')})(?![${ALNUM}])`,
  'iu'
)

// Where the model name ends: a delimiter, or the next labelled fact of the title.
const MODEL_STOP_RE = new RegExp(
  '[,;()]|(?:^|\\s+)(?:' +
    `(?:19|20)\\d{2}\\s*(?:р\\b|р\\.|рік|року)|р\\.?\\s?в\\b|рік|року|колір|кольору|\\p{L}+ого(?![${ALNUM}])|без|VIN|ДНЗ|д[./]?\\s?н|держ|реєстр|номер|кузов|шасі|тип\\b|№|двигун|об['’ʼ]єм|категор|вантажн|легков|тягач|бортов|ідентиф` +
    ')',
  'iu'
)

const MODEL_LABEL_RE = /модел[іь]\s*:?\s*[«"“]?/iu

/** The model name after the make ("марки VOLKSWAGEN, модель GOLF, …" → GOLF); null when the title goes straight to other facts. */
function modelAfter(rest: string): string | null {
  const cut = (text: string): string | null => {
    const s = text.replace(/^[\s,:;"«»“”'‘’\-–]+/, '')
    const stop = MODEL_STOP_RE.exec(s)
    const model = (stop ? s.slice(0, stop.index) : s)
      .replace(/["«»“”]/g, '')
      .replace(/\s+\d[.,]\d.*$/u, '') // engine size and what follows ("Taurus 3.0i V6")
      .replace(/[\s\-–:]+$/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase()
    return model.length >= 1 && model.length <= 40 ? model : null
  }
  const label = MODEL_LABEL_RE.exec(rest)
  // "марки X, модель Y": the label wins when it comes right after the make; otherwise the name sits straight after it.
  if (label && rest.slice(0, label.index).replace(/[\s,:;"«»“”'‘’]/g, '') === '')
    return cut(rest.slice(label.index + label[0].length))
  return cut(rest) ?? (label ? cut(rest.slice(label.index + label[0].length)) : null)
}

/** Cyrillic look-alikes folded to Latin, same length: "Merсedes" (Cyrillic с), "МАN" (Cyrillic М) → "MERCEDES", "MAN". */
const foldLookalikes = (s: string): string => s.replace(/[АВСЕНІКМОРТХ]/giu, c => denormalizePlate(c))

/** First known make in the title and the model that follows it. Mixed Cyrillic / Latin spellings are matched on a folded copy. */
export function titleMakeModel(title: string): { make: string | null; model: string | null } {
  const folded = foldLookalikes(title)
  for (const text of [title, folded]) {
    const m = MAKE_RE.exec(text)
    const make = m ? (MAKE_BY_SPELLING.get((m[1] ?? '').replace(/\s+/g, ' ').toUpperCase()) ?? null) : null
    if (m && make) {
      // A Latin make has Latin model names ("А6" typed with a Cyrillic А); a Cyrillic make keeps its text as typed.
      // The cut runs on the text as typed (the stop words are Cyrillic); only the name found is folded.
      const model = modelAfter(title.slice(m.index + m[0].length))
      return { make, model: model && /^[A-Z]/.test(make) ? foldLookalikes(model) : model }
    }
  }
  return { make: null, model: null }
}

export type ParsedTitle = {
  plate: string | null
  vin: string | null
  make: string | null
  model: string | null
  year: number | null
}

export function parseLotTitle(title: string, now = new Date()): ParsedTitle {
  return { plate: titlePlate(title), vin: titleVin(title), ...titleMakeModel(title), year: titleYear(title, now) }
}

export type AuctionLotRowInput = Omit<AuctionLotInsert, 'firstSeenAt' | 'updatedAt'>

/** Null for a lot outside the vehicle categories (flats, phones, boats …). */
export function toAuctionLotInsert(
  cells: AuctionCsvCells,
  sourceFile: string,
  now = new Date()
): AuctionLotRowInput | null {
  if (!(VEHICLE_CATEGORIES as readonly string[]).includes(cells.category)) return null
  const title = cells.title.replace(/\s+/g, ' ')
  return {
    lotNo: cells.lotNo,
    proceedingNo: cells.proceeding?.trim() || null,
    status: cells.status,
    category: cells.category,
    region: lotRegion(cells.location),
    startPrice: lotPrice(cells.startPrice),
    salePrice: lotPrice(cells.salePrice),
    titleRaw: title,
    ...parseLotTitle(title, now),
    sourceFile
  }
}

export type ParsedAuctionCsv = {
  lots: AuctionLotRowInput[]
  /** Rows of all categories. */
  rows: number
  /** Records that failed validation (no lot number, empty title …). */
  invalid: number
}

/** One monthly CSV file → vehicle lots. */
export function parseAuctionCsv(text: string, sourceFile: string, now = new Date()): ParsedAuctionCsv {
  const records: string[][] = parse(text.replace(/^\uFEFF/, ''), { relax_column_count: true, skip_empty_lines: true })
  const [header, ...body] = records
  if (!header) throw new Error(`${sourceFile}: empty CSV`)
  const layout = auctionLayout(header)
  const lots: AuctionLotRowInput[] = []
  let invalid = 0
  for (const rec of body) {
    const cell = (f: keyof AuctionCsvCells): string | undefined => {
      const idx = layout[f]
      return idx === undefined ? undefined : rec[idx]
    }
    const parsed = AuctionCsvCellsSchema.safeParse({
      title: cell('title'),
      status: cell('status'),
      category: cell('category'),
      location: cell('location'),
      lotNo: cell('lotNo'),
      startPrice: cell('startPrice'),
      salePrice: cell('salePrice'),
      proceeding: cell('proceeding')
    })
    if (!parsed.success) {
      invalid++
      continue
    }
    const lot = toAuctionLotInsert(parsed.data, sourceFile, now)
    if (lot) lots.push(lot)
  }
  return { lots, rows: body.length, invalid }
}
