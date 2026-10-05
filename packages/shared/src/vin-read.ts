import { isVin } from './plate.js'

/** One OCR text line and its confidence (0-1). */
export type OcrLine = { text: string; score: number }

export type VinRead = { vin: string; score: number; checkDigitOk: boolean }

const TRANSLITERATION: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9
}
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]
const VIN_LENGTH = 17

/**
 * ISO 3779 / FMVSS check digit (position 9). Mandatory in North America only — many EU/UA-market VINs
 * legitimately fail it — so treat it as a ranking hint, never a rejection.
 */
export function vinCheckDigitOk(vin: string): boolean {
  let sum = 0
  for (let i = 0; i < VIN_LENGTH; i++) {
    const ch = vin[i] ?? ''
    const value = /\d/.test(ch) ? Number(ch) : TRANSLITERATION[ch]
    if (value === undefined) return false
    sum += value * (WEIGHTS[i] ?? 0)
  }
  const expected = sum % 11 === 10 ? 'X' : String(sum % 11)
  return vin[8] === expected
}

/** OCR confuses O/Q with 0 and I with 1; none of I, O, Q exist in a VIN, so the remap is lossless. */
const compactVin = (text: string): string =>
  text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/[OQ]/g, '0')
    .replace(/I/g, '1')

// Where a read came from, most trustworthy first: a line that is exactly a VIN, a VIN inside a longer
// line ("VIN: …"), a VIN wrapped over two short lines.
const SOURCE_EXACT = 0
const SOURCE_WINDOW = 1
const SOURCE_JOINED = 2

/**
 * The I→1 / O→0 remap makes any long label ("Vehicle identification number") fit the VIN alphabet, so
 * require real digit content: ISO 3779 makes the last 4 characters numeric for most makers. A whole line
 * that is exactly 17 characters gets a looser test (some makers end in letters).
 */
const looksLikeVin = (vin: string, source: number): boolean =>
  source === SOURCE_EXACT ? (vin.match(/\d/g)?.length ?? 0) >= 3 : /\d{4}$/.test(vin)

type Ranked = VinRead & { source: number }

/**
 * Pulls VIN candidates out of OCR lines, best first. Source comes before check digit: a document such as a
 * registration certificate is full of other text, and about 1 in 11 junk 17-char windows pass the check
 * digit by chance — while many real EU/UA VINs fail it. Within a source: check digit, then OCR confidence.
 */
export function extractVins(lines: OcrLine[]): VinRead[] {
  const found = new Map<string, Ranked>()
  const add = (vin: string, score: number, source: number): void => {
    if (!isVin(vin) || !looksLikeVin(vin, source)) return
    const prev = found.get(vin)
    if (!prev || source < prev.source || (source === prev.source && score > prev.score)) {
      found.set(vin, { vin, score, source, checkDigitOk: vinCheckDigitOk(vin) })
    }
  }

  const compacts = lines.map(line => compactVin(line.text))
  compacts.forEach((compact, i) => {
    const score = lines[i]?.score ?? 0
    if (compact.length === VIN_LENGTH) add(compact, score, SOURCE_EXACT)
    else
      for (let at = 0; at + VIN_LENGTH <= compact.length; at++) {
        add(compact.slice(at, at + VIN_LENGTH), score, SOURCE_WINDOW)
      }

    // Only two fragments that are each too short to hold a VIN can be one wrapped VIN.
    const next = compacts[i + 1]
    if (next === undefined || compact.length >= VIN_LENGTH || next.length >= VIN_LENGTH) return
    const joined = compact + next
    const nextScore = lines[i + 1]?.score ?? 0
    for (let at = 0; at + VIN_LENGTH <= joined.length; at++) {
      // The window must use both fragments, else it is just one of them again.
      if (at < compact.length && at + VIN_LENGTH > compact.length) {
        add(joined.slice(at, at + VIN_LENGTH), Math.min(score, nextScore), SOURCE_JOINED)
      }
    }
  })

  return [...found.values()]
    .sort((a, b) => a.source - b.source || Number(b.checkDigitOk) - Number(a.checkDigitOk) || b.score - a.score)
    .map(({ vin, score, checkDigitOk }) => ({ vin, score, checkDigitOk }))
}
