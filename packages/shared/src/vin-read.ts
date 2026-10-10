import { isVin } from './plate.js'
import { hasKnownWmi } from './wmi.js'

/** A rectangle as fractions (0-1) of the photo's width/height. */
export type Box = { x: number; y: number; w: number; h: number }

/** One OCR text line, its confidence (0-1) and, when the reader reports it, where it sits in the photo. */
export type OcrLine = { text: string; score: number; box?: Box }

export type VinRead = { vin: string; score: number; checkDigitOk: boolean; box?: Box }

const unionBox = (a: Box | undefined, b: Box | undefined): Box | undefined => {
  if (!a || !b) return a ?? b
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
}

/** The slice of a horizontal line box that a word occupies, by character position (OCR text is near-monospace). */
const wordBox = (box: Box | undefined, text: string, word: string): Box | undefined => {
  const at = text.indexOf(word)
  if (!box || at < 0 || text.length === 0 || box.w < box.h) return box
  return { ...box, x: box.x + (box.w * at) / text.length, w: (box.w * word.length) / text.length }
}

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

const MIN_FRAGMENT = 6

/** A wrapped VIN's second half sits just below the first and overlaps it horizontally; unknown positions pass. */
const stacked = (a: Box | undefined, b: Box | undefined): boolean => {
  if (!a || !b) return true
  const overlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const gap = b.y - (a.y + a.h)
  return overlap > 0 && b.y >= a.y + a.h / 2 && gap <= 2 * Math.max(a.h, b.h)
}

const isLabelLine = (text: string): boolean =>
  text.includes(':') ||
  text.includes('/') ||
  text.includes('-') ||
  text.split(/[^A-Za-z0-9]+/).some(word => /^[A-Za-z]{5,}$/.test(word))

/** Stamped VINs are fenced by asterisks (`*KLATF08Y1VB363636*`) that OCR reads as "X": 19 characters, X at both ends. */
const unstar = (compact: string): string =>
  compact.length === VIN_LENGTH + 2 && compact.startsWith('X') && compact.endsWith('X') ? compact.slice(1, -1) : compact

// Where a read came from, most trustworthy first: a line that is exactly a VIN, a VIN inside a longer
// line ("VIN: …"), a VIN wrapped over two short lines.
const SOURCE_EXACT = 0
const SOURCE_WINDOW = 1
const SOURCE_JOINED = 2

/**
 * The I→1 / O→0 remap makes any long label ("Vehicle identification number") fit the VIN alphabet, so
 * require real digit content: ISO 3779 makes the last 4 characters numeric for most makers. A whole line
 * that is exactly 17 characters gets a looser test (some makers end in letters) — but only when the check
 * digit vouches for it: a slogan or badge text such as "MINI COOPER CLUBMAN" also fits the alphabet and
 * contains a few 0/1 from the O/I remap, and must not outrank the real VIN in a longer line.
 */
const looksLikeVin = (vin: string, source: number): boolean =>
  /\d{4}$/.test(vin) || (source === SOURCE_EXACT && (vin.match(/\d/g)?.length ?? 0) >= 3 && vinCheckDigitOk(vin))

/** Whether b is a (up to 4 characters) shifted copy of a — they share a run of at least 13 characters. */
const isShiftedCopy = (a: string, b: string): boolean => {
  for (let d = 1; d <= 4; d++)
    if (a.slice(d) === b.slice(0, VIN_LENGTH - d) || b.slice(d) === a.slice(0, VIN_LENGTH - d)) return true
  return false
}

type Ranked = VinRead & { source: number; corrected?: boolean }

/** Look-alike pairs OCR swaps in embossed/stamped text (an `M` read as `N`, `8` as `B`…), both directions. */
const LOOKALIKES: Readonly<Record<string, string>> = {
  M: 'N',
  N: 'M',
  '8': 'B',
  B: '8',
  '5': 'S',
  S: '5',
  '2': 'Z',
  Z: '2',
  '6': 'G',
  G: '6',
  '0': 'D',
  D: '0',
  U: 'V',
  V: 'U'
}

/**
 * A read whose manufacturer prefix we don't know but which is one look-alike swap away from one we do
 * ("NNC…" → Ford Thailand's "MNC…") is most likely that read with one wrong letter.
 */
function correctedByWmi(read: Ranked): Ranked[] {
  if (hasKnownWmi(read.vin)) return []
  const out: Ranked[] = []
  for (let at = 0; at < 3; at++) {
    const swap = LOOKALIKES[read.vin[at] ?? '']
    if (!swap) continue
    const vin = read.vin.slice(0, at) + swap + read.vin.slice(at + 1)
    if (isVin(vin) && hasKnownWmi(vin)) out.push({ ...read, vin, checkDigitOk: vinCheckDigitOk(vin), corrected: true })
  }
  return out
}

/**
 * Pulls VIN candidates out of OCR lines, best first. Source comes before check digit: a document such as a
 * registration certificate is full of other text, and about 1 in 11 junk 17-char windows pass the check
 * digit by chance — while many real EU/UA VINs fail it. Within a source: check digit, then OCR confidence.
 */
export function extractVins(lines: OcrLine[]): VinRead[] {
  const found = new Map<string, Ranked>()
  const add = (vin: string, score: number, source: number, box?: Box): void => {
    if (!isVin(vin) || !looksLikeVin(vin, source)) return
    const prev = found.get(vin)
    if (!prev || source < prev.source || (source === prev.source && score > prev.score)) {
      found.set(vin, { vin, score, source, checkDigitOk: vinCheckDigitOk(vin), box })
    }
  }

  // Label text ("IMAGE ID: 2701628693", "NISSAN MOTOR…") must not be glued into a VIN-shaped string: skip whole-line
  // compaction for a line with a colon or a word made only of 5+ letters. A VIN's own words are still read one by
  // one below (a VIN word mixes digits in, so "XKLATF08Y1…" is not a letters-only word).
  const compacts = lines.map(line => (isLabelLine(line.text) ? '' : compactVin(line.text)))
  compacts.forEach((compact, i) => {
    const score = lines[i]?.score ?? 0
    const box = lines[i]?.box
    if (unstar(compact).length === VIN_LENGTH) add(unstar(compact), score, SOURCE_EXACT, box)
    else {
      // A whitespace/colon-delimited word that is exactly 17 long ("V.I.N WMW…") is as good as a whole-line VIN;
      // only then fall back to sliding windows, whose shifted copies are often junk.
      const text = lines[i]?.text ?? ''
      for (const word of text.split(/[\s:;,|]+/)) {
        const w = unstar(compactVin(word))
        if (w.length === VIN_LENGTH) add(w, score, SOURCE_EXACT, wordBox(box, text, word))
      }
      for (let at = 0; at + VIN_LENGTH <= compact.length; at++) {
        add(compact.slice(at, at + VIN_LENGTH), score, SOURCE_WINDOW, box)
      }
    }

    // Only two fragments that are each too short to hold a VIN can be one wrapped VIN.
    const next = compacts[i + 1]
    if (next === undefined || compact.length >= VIN_LENGTH || next.length >= VIN_LENGTH) return
    // Scraps ("023", "800DBA") are not half a VIN; with positions known, the halves must also be stacked.
    if (compact.length < MIN_FRAGMENT || next.length < MIN_FRAGMENT || !stacked(box, lines[i + 1]?.box)) return
    const joined = compact + next
    const nextScore = lines[i + 1]?.score ?? 0
    for (let at = 0; at + VIN_LENGTH <= joined.length; at++) {
      // The window must use both fragments, else it is just one of them again.
      if (at < compact.length && at + VIN_LENGTH > compact.length) {
        add(
          joined.slice(at, at + VIN_LENGTH),
          Math.min(score, nextScore),
          SOURCE_JOINED,
          unionBox(box, lines[i + 1]?.box)
        )
      }
    }
  })

  // The unfixed read is the same photo text with one wrong letter, not a second VIN: replace it, don't list both.
  for (const read of [...found.values()]) {
    const fixes = correctedByWmi(read)
    if (fixes.length === 0) continue
    found.delete(read.vin)
    for (const fix of fixes) if (!found.has(fix.vin)) found.set(fix.vin, fix)
  }

  const ranked = [...found.values()].sort(
    (a, b) =>
      a.source - b.source ||
      Number(hasKnownWmi(b.vin)) - Number(hasKnownWmi(a.vin)) ||
      Number(b.checkDigitOk) - Number(a.checkDigitOk) ||
      Number(!!b.corrected) - Number(!!a.corrected) ||
      b.score - a.score
  )

  // One VIN printed once is one VIN: a read that is just a shifted copy of a better one ("V1N3KPFT…" windows around
  // "3KPFT4DE1TE349095") is the same text on the plate, not another candidate.
  const kept: Ranked[] = []
  for (const read of ranked) if (!kept.some(k => isShiftedCopy(k.vin, read.vin))) kept.push(read)

  return kept.map(({ vin, score, checkDigitOk, box }) =>
    box ? { vin, score, checkDigitOk, box } : { vin, score, checkDigitOk }
  )
}
