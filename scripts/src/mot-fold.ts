import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { type MotKind, modelKey } from '@carplates/shared'

/** A make/model is a "real model" (never folded, a valid fold target) with this many tests in both 2021 and 2022. */
export const REAL_MODEL_MIN_TESTS = 300

/**
 * Distinct models launched after 2021 whose name starts with an older model's ("IONIQ 5", "MUSTANG MACH-E"). UK cars
 * take their first MOT at 3 years, so the 2021-22 files never saw them and the real-model list cannot know them.
 * `kind|makeKey|modelKey`; add a line when a new one shows up.
 */
export const MOT_KEEP_SEPARATE: readonly string[] = [
  'car|hyundai|ioniq5',
  'car|hyundai|ioniq6',
  'car|ford|mustangmache',
  'car|toyota|yariscross',
  'car|toyota|aygox',
  'car|toyota|proacecity',
  'van|toyota|proacecity',
  'car|citroen|c5aircross',
  'car|citroen|c5x',
  'car|mitsubishi|eclipsecross',
  'car|suzuki|sx4scross',
  'car|vauxhall|grandlandx',
  'car|vauxhall|crosslandx',
  'car|ds|ds3crossback',
  'car|volkswagen|tiguanallspace',
  'car|ford|tourneocourier'
]

/** Abbreviated spellings of a leading model name, expanded before the prefix lookup ("DISCOVERY SPT RDYN" is Discovery Sport). */
const MODEL_ABBREVIATIONS: readonly (readonly [RegExp, string])[] = [
  [/^DISCOVERY SPT\b/, 'DISCOVERY SPORT'],
  [/^RANGE ROVER SPT\b/, 'RANGE ROVER SPORT'],
  [/^TIGUAN ASPACE\b/, 'TIGUAN ALLSPACE']
]

const expandAbbreviations = (model: string): string =>
  MODEL_ABBREVIATIONS.reduce((m, [from, to]) => m.replace(from, to), model.trim())

/**
 * Models that are electric throughout: their "EV" trims are not a split ("ZOE ICONIC RAPID CHARGE EV 50" vs "ZOE"),
 * so splitting would only shrink the sample. `kind|makeKey|modelKey`.
 */
export const MOT_EV_ONLY: readonly string[] = ['car|renault|zoe', 'car|nissan|leaf']

/** A standalone EV word in the trim; "PHEV", "HEV", "E-TECH", "TFSI E" are other words and never match. */
const EV_WORD = /^(EV|BEV|ELECTRIC)$/

/** Suffix of the key an electric trim of a base model is counted under ("niro" -> "niroev"). */
export const EV_KEY_SUFFIX = 'ev'

const loadReal = (): ReadonlySet<string> =>
  new Set(JSON.parse(readFileSync(resolve(import.meta.dirname, 'mot-real-models.json'), 'utf8')) as string[])

/**
 * DVSA's 2024+ files put the trim in the model ("KUGA ST-LINE X ED PHEV CVT"). Folds such a key into the longest
 * whole-word prefix of the raw model that is a real model ("KUGA"). A real model itself is never folded, so
 * "range rover sport" / "transit connect" keep their own keys.
 */
export class MotFold {
  constructor(
    private readonly real: ReadonlySet<string> = loadReal(),
    private readonly keep: ReadonlySet<string> = new Set(MOT_KEEP_SEPARATE),
    /** Allowed `kind|make|<base>ev` keys; a split into any other `ev` key is folded back into the base. Null = all. */
    private readonly evAllowed: ReadonlySet<string> | null = null,
    private readonly evOnly: ReadonlySet<string> = new Set(MOT_EV_ONLY)
  ) {}

  /** Every `ev` key a split produced so far (the ingest gates them on their test count, then folds again). */
  readonly evSplits = new Set<string>()

  /** The base, or its `ev` key when the trim words carry an EV word and the base is not electric throughout. */
  private split(own: string, base: string, trim: string[]): string {
    if (
      this.evOnly.has(own + base) ||
      this.keep.has(own + base) ||
      !trim.some(w => EV_WORD.test(w.replace(/[^A-Z]/g, '')))
    )
      return base
    const ev = base + EV_KEY_SUFFIX
    this.evSplits.add(own + ev)
    return !this.evAllowed || this.evAllowed.has(own + ev) ? ev : base
  }

  /** Model key to count the test under; `mo` is `modelKey(rawModel)`. */
  fold(kind: MotKind, mk: string, mo: string, rawModel: string): string {
    const own = `${kind}|${mk}|`
    if (this.real.has(own + mo) || this.keep.has(own + mo)) return mo
    const expanded = expandAbbreviations(rawModel)
    const words = expanded.split(/\s+/)
    // An expanded name may itself be the whole model ("DISCOVERY SPT"); otherwise the full text is the key being folded.
    for (let n = expanded === rawModel.trim() ? words.length - 1 : words.length; n >= 1; n--) {
      const prefix = modelKey(words.slice(0, n).join(' '))
      // A kept-separate model's own trims fold into it, not past it ("IONIQ 5 PREMIUM" -> ioniq5).
      if (prefix && (this.real.has(own + prefix) || this.keep.has(own + prefix)))
        return this.split(own, prefix, words.slice(n))
    }
    return mo
  }
}

/** Display name of a (folded) key: the leading words of the raw model whose key is `mo` ("IONIQ 5 PREMIUM EV" -> "IONIQ 5"). */
export function baseModelName(model: string, mo: string): string {
  const words = expandAbbreviations(model).split(/\s+/)
  for (let n = 1; n <= words.length; n++) {
    const name = words.slice(0, n).join(' ')
    if (modelKey(name) === mo) return name
    if (modelKey(name) + EV_KEY_SUFFIX === mo) return `${name} EV`
  }
  return expandAbbreviations(model)
}
