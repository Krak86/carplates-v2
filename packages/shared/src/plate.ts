/**
 * Ukrainian plate / VIN normalization.
 *
 * The state registry stores plate numbers in Cyrillic (`ВЕ7116АА`). Users type
 * them however their keyboard is set — Latin `BE7116AA`, mixed case, with spaces
 * or slashes. Every layer (web input, API param, ingest CSV row) MUST run the
 * plate through `normalizePlate` so the query key and the stored key are the same
 * string. This is the single source of truth — never re-implement it elsewhere.
 */

// The 12 Latin letters that have an identical-looking Cyrillic glyph and are the
// only letters that appear on Ukrainian plates. Letters with no lookalike are
// left as-is (a valid plate never contains them).
const LATIN_TO_CYRILLIC: Readonly<Record<string, string>> = {
  A: 'А',
  B: 'В',
  C: 'С',
  E: 'Е',
  H: 'Н',
  I: 'І',
  K: 'К',
  M: 'М',
  O: 'О',
  P: 'Р',
  T: 'Т',
  X: 'Х'
}

const CYRILLIC_TO_LATIN: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(LATIN_TO_CYRILLIC).map(([latin, cyrillic]) => [cyrillic, latin])
)

const stripped = (input: string): string => input.replace(/[\s/]+/g, '').toUpperCase()

/** Latin (and mixed) plate input → canonical uppercase Cyrillic, no spaces or slashes. */
export function normalizePlate(input: string): string {
  return Array.from(stripped(input))
    .map(char => LATIN_TO_CYRILLIC[char] ?? char)
    .join('')
}

/** Canonical Cyrillic plate → Latin transliteration (for external services keyed on Latin). */
export function denormalizePlate(input: string): string {
  return Array.from(stripped(input))
    .map(char => CYRILLIC_TO_LATIN[char] ?? char)
    .join('')
}

// Characters ALPR engines confuse with a look-alike of the other kind, applied by
// slot (letter slot vs digit slot) once the plate's shape is known.
const DIGIT_TO_LETTER: Readonly<Record<string, string>> = { '0': 'O', '1': 'I', '8': 'B', '2': 'Z', '5': 'S' }
const LETTER_TO_DIGIT: Readonly<Record<string, string>> = {
  O: '0',
  О: '0',
  I: '1',
  І: '1',
  B: '8',
  В: '8',
  Z: '2',
  S: '5'
}

// Plate shapes seen in the registry (16.7M rows): L = letter, D = digit.
//   LLDDDDLL  ~91% — current series. Besides the 12 Cyrillic-lookalike letters it uses other
//             Latin letters (Y, Z, J, F, D, G, …): ~6% of rows, e.g. every electric-car series.
//   DDLLDDDD  ~8%  — legacy series with the region-code digits first ("11АА1234").
// Rarer shapes (6 digits, 4 letters, diplomatic, …) are deliberately not matched here.
const PLATE_SHAPES = ['LLDDDDLL', 'DDLLDDDD'] as const

const isDigit = (c: string): boolean => c >= '0' && c <= '9'
const isLetter = (c: string): boolean => !isDigit(c) && c.toLowerCase() !== c.toUpperCase()

/**
 * ALPR quirk fix: engines misread look-alikes across the letter/digit boundary
 * (Ukrainian "I" as "1", "O" as "0", "B" as "8", "Z" as "2", and the reverse inside
 * digit blocks). Works by slot: picks the 8-char shape the read already fits best
 * and converts only the chars that sit in the wrong kind of slot — a "1" inside a
 * digit block is a real digit. Ported from v1's `changeSymbols1toI`, generalised.
 * Run this BEFORE normalizePlate (it expects Latin).
 */
export function repairOcrPlate(input: string): string {
  const s = stripped(input)
  if (s.length !== 8) return s // not a UA plate shape — leave alone
  const chars = Array.from(s)
  const fit = (shape: string): number => chars.filter((c, i) => (shape[i] === 'L' ? isLetter(c) : isDigit(c))).length
  const shape = fit(PLATE_SHAPES[1]) > fit(PLATE_SHAPES[0]) ? PLATE_SHAPES[1] : PLATE_SHAPES[0]
  return chars.map((c, i) => (shape[i] === 'L' ? (DIGIT_TO_LETTER[c] ?? c) : (LETTER_TO_DIGIT[c] ?? c))).join('')
}

// Letters after normalizePlate: the 12 Cyrillic look-alikes, or any other Latin letter.
const UA_PLATE_RES = [/^[АВСЕНІКМОРТХA-Z]{2}\d{4}[АВСЕНІКМОРТХA-Z]{2}$/, /^\d{2}[АВСЕНІКМОРТХA-Z]{2}\d{4}$/]

/** True when the (any-script) input is a complete UA plate in one of the known 8-char shapes. */
export function isUaPlate(input: string): boolean {
  const plate = normalizePlate(input)
  return UA_PLATE_RES.some(re => re.test(plate))
}

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/

/** A query is treated as a VIN when it is 17 chars of the ISO 3779 alphabet (no I, O, Q). */
export function isVin(input: string): boolean {
  return VIN_RE.test(input.replace(/\s+/g, '').toUpperCase())
}

/** Classify a raw search box / URL value. */
export function classifyQuery(input: string): 'vin' | 'plate' {
  return isVin(input) ? 'vin' : 'plate'
}
