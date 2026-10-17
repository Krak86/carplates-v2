/** Parsers for the stolen.in.ua pages (month cards, per-vehicle detail). Pure — the fetching lives in `wanted-history.ts`. */

export type MonthCard = {
  /** The `/v/<ident>` id: a plate, a VIN or a placeholder (`XXXXXXXX`, `0000`, `*`). */
  ident: string
  found: boolean
  /** Alt text of the type icon (`Легковий автотранспорт`). */
  vehicleType: string | null
  brand: string | null
  model: string | null
  /** Theft date `YYYY-MM-DD` (the month page gives the year, the card the day and the month). */
  seizedAt: string | null
}

export type DetailRecord = {
  /** `У розшуку` (still wanted, already in the feed) vs `Був у розшуку` (removed from the list). */
  current: boolean
  brand: string | null
  model: string | null
  vehicleType: string | null
  color: string | null
  plate: string | null
  bodyNumber: string | null
  chassisNumber: string | null
  seizedAt: string | null
  registeredAt: string | null
  organUnit: string | null
  /** Date the record was removed from the wanted list (`YYYY-MM-DD`), past records only. */
  resolvedAt: string | null
}

const SHORT_MONTHS = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру']
const LONG_MONTHS = [
  'січня',
  'лютого',
  'березня',
  'квітня',
  'травня',
  'червня',
  'липня',
  'серпня',
  'вересня',
  'жовтня',
  'листопада',
  'грудня'
]
export const MONTH_SLUGS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const

const pad = (n: number): string => String(n).padStart(2, '0')

const decode = (s: string): string =>
  s
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')

/** `aug-20` → `{ year: 2020, month: 8 }`. */
export function parseMonthSlug(slug: string): { year: number; month: number } | null {
  const m = /^([a-z]{3})-(\d{2})$/.exec(slug)
  const month = m ? MONTH_SLUGS.indexOf(m[1] as (typeof MONTH_SLUGS)[number]) + 1 : 0
  return m && month ? { year: 2000 + Number(m[2]), month } : null
}

/** `2020-08` → `aug-20`. */
export function monthSlug(year: number, month: number): string {
  return `${MONTH_SLUGS[month - 1]}-${String(year % 100).padStart(2, '0')}`
}

/** `1 серп.` + year 2020 → `2020-08-01`. */
export function parseCardDate(text: string, year: number): string | null {
  const m = /^(\d{1,2})\s+([а-яії]+)/i.exec(text.trim())
  const month = m ? SHORT_MONTHS.indexOf(m[2]!.toLowerCase().slice(0, 3)) + 1 : 0
  return m && month ? `${year}-${pad(month)}-${pad(Number(m[1]))}` : null
}

/** `30 квітня 2026 р.` → `2026-04-30`. */
export function parseLongDate(text: string): string | null {
  const m = /^(\d{1,2})\s+([а-яії]+)\s+(\d{4})/i.exec(text.trim())
  const month = m ? LONG_MONTHS.indexOf(m[2]!.toLowerCase()) + 1 : 0
  return m && month && Number(m[3]) >= 1900 ? `${m[3]}-${pad(month)}-${pad(Number(m[1]))}` : null
}

/** Ids that stand for "unknown" — no detail page worth fetching. */
export function isPlaceholderIdent(ident: string): boolean {
  return ident.length < 4 || /^(?:X+|0+|\*+|-+)$/i.test(ident)
}

/** The month page header: stolen / found totals (`401` / `297`). */
export function parseMonthTotals(html: string): { stolen: number; found: number } | null {
  const spans = [...html.matchAll(/<span class="font-semibold text-amber-300">([\d\s]+)<\/span>/g)]
  const stolen = Number(spans[0]?.[1]?.replace(/\s/g, ''))
  const found = Number(spans[1]?.[1]?.replace(/\s/g, ''))
  return spans.length >= 2 && Number.isFinite(stolen) && Number.isFinite(found) ? { stolen, found } : null
}

/** All cards of a `/history/<mon>-<yy>` page (green = found, red = still wanted). */
export function parseMonthCards(html: string, year: number): MonthCard[] {
  const cards: MonthCard[] = []
  for (const m of html.matchAll(/<a href="\/v\/([^"]+)" class="([^"]*)">([\s\S]*?)<\/a>/g)) {
    const [, rawIdent, cls, inner] = m
    const found = cls!.includes('bg-emerald-950')
    if (!found && !cls!.includes('bg-rose-950')) continue
    const type = /<img src="\/icons\/[^"]+" alt="([^"]*)"/.exec(inner!)
    const name = /<span class="flex flex-col">([^<]*)(?:<small[^>]*>([^<]*)<\/small>)?/.exec(inner!)
    const day = /<div class="flex justify-end[^"]*">([^<]*)<\/div>/.exec(inner!)
    cards.push({
      ident: decodeURIComponent(rawIdent!).trim(),
      found,
      vehicleType: type?.[1] ? decode(type[1]) : null,
      brand: name?.[1]?.trim() ? decode(name[1].trim()) : null,
      model: name?.[2]?.trim() ? decode(name[2].trim()) : null,
      seizedAt: day?.[1] ? parseCardDate(decode(day[1]), year) : null
    })
  }
  return cards
}

function tokens(html: string): string[] {
  return decode(
    html
      .replace(/<svg[\s\S]*?<\/svg>/g, '')
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<[^>]+>/g, '|')
  )
    .split('|')
    .map(t => t.trim())
    .filter(Boolean)
}

const valueAfter = (t: string[], label: string): string | null => {
  const v = t[t.indexOf(label) + 1]
  return v && t.includes(label) ? v : null
}
const dateBefore = (t: string[], label: string): string | null => {
  const i = t.indexOf(label)
  return i > 0 ? parseLongDate(t[i - 1]!) : null
}
/** `Невідомо` (unknown) and empty → null. */
const known = (v: string | null): string | null => (v && v !== 'Невідомо' ? v : null)

/** Every record block of a `/v/<ident>` page (current `У розшуку` first, then `Був у розшуку`). */
export function parseDetailRecords(html: string): DetailRecord[] {
  const t = tokens(html.slice(Math.max(0, html.indexOf('<main'))))
  const starts = t.flatMap((tok, i) => (tok === 'У розшуку' || tok === 'Був у розшуку' ? [i] : []))
  const records: DetailRecord[] = []
  starts.forEach((start, n) => {
    const block = t.slice(start, starts[n + 1] ?? t.length)
    const typeAt = block.indexOf('Тип транспортного засобу')
    if (typeAt < 0) return // the summary headline, not a record
    records.push({
      current: block[0] === 'У розшуку',
      brand: block[1] && typeAt > 1 ? block[1] : null,
      model: block[2] && typeAt > 2 ? block[2] : null,
      vehicleType: valueAfter(block, 'Тип транспортного засобу'),
      color: known(valueAfter(block, 'Колір')),
      plate: known(valueAfter(block, 'Державний номерний знак')),
      bodyNumber: known(valueAfter(block, 'Номер кузова (VIN)')),
      chassisNumber: known(valueAfter(block, 'Номер шассі')),
      seizedAt: dateBefore(block, 'Дата незаконного заволодіння'),
      registeredAt: dateBefore(block, 'Дата обліку інформації'),
      organUnit: valueAfter(block, 'Підрозділ, що здійснює розшук:'),
      resolvedAt: dateBefore(block, 'Вилучено з розшуку')
    })
  })
  return records
}
