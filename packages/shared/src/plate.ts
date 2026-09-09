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

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/

/** A query is treated as a VIN when it is 17 chars of the ISO 3779 alphabet (no I, O, Q). */
export function isVin(input: string): boolean {
  return VIN_RE.test(input.replace(/\s+/g, '').toUpperCase())
}

/** Classify a raw search box / URL value. */
export function classifyQuery(input: string): 'vin' | 'plate' {
  return isVin(input) ? 'vin' : 'plate'
}
