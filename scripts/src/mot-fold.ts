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
  'car|mitsubishi|eclipsecross'
]

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
    private readonly keep: ReadonlySet<string> = new Set(MOT_KEEP_SEPARATE)
  ) {}

  /** Model key to count the test under; `mo` is `modelKey(rawModel)`. */
  fold(kind: MotKind, mk: string, mo: string, rawModel: string): string {
    const own = `${kind}|${mk}|`
    if (this.real.has(own + mo) || this.keep.has(own + mo)) return mo
    const words = rawModel.trim().split(/\s+/)
    for (let n = words.length - 1; n >= 1; n--) {
      const prefix = modelKey(words.slice(0, n).join(' '))
      // A kept-separate model's own trims fold into it, not past it ("IONIQ 5 PREMIUM" -> ioniq5).
      if (prefix && (this.real.has(own + prefix) || this.keep.has(own + prefix))) return prefix
    }
    return mo
  }
}

/** Display name of a (folded) key: the leading words of the raw model whose key is `mo` ("IONIQ 5 PREMIUM EV" -> "IONIQ 5"). */
export function baseModelName(model: string, mo: string): string {
  const words = model.trim().split(/\s+/)
  for (let n = 1; n <= words.length; n++) {
    if (modelKey(words.slice(0, n).join(' ')) === mo) return words.slice(0, n).join(' ')
  }
  return model
}
