import { brandSlug } from './brandLogo.js'

/**
 * The make half of the Euro NCAP matching key. Starts from `brandSlug`'s lookup table
 * (falling back to the raw brand string for brands it doesn't cover), then strips
 * everything but letters and digits — same treatment as `modelKey` below, and for the
 * same reason: Euro NCAP's own URL slugs are inconsistent about word separators
 * (`mercedes-benz` uses a hyphen, but `land+rover`/`alfa+romeo`/`lynk+-+co` use `+`,
 * sometimes mixed with `-`), so matching on the hyphenated form would silently miss
 * every brand where Euro NCAP's separator choice doesn't match `brandSlug`'s. Stripping
 * to alphanumeric-only sidesteps that entirely — both this function and the scraper
 * (`scripts/src/euroncap-parse.ts`) collapse to the same key regardless of separator.
 */
export function makeKey(brand: string | null | undefined): string | null {
  if (!brand) return null
  const key = (brandSlug(brand) ?? brand).toLowerCase().replace(/[^a-z0-9]+/g, '')
  return key || null
}

/**
 * The model half of the Euro NCAP matching key. Strips everything but letters and
 * digits so registry trim/variant noise ("CLA 250", "3 Series", "GOLF VARIANT") and
 * Euro NCAP URL-slug punctuation ("model+3") collapse to the same key ("cla250",
 * "3series", "golfvariant", "model3").
 */
export function modelKey(model: string | null | undefined): string | null {
  if (!model) return null
  const key = model
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
  return key || null
}

// Mazda's own Euro NCAP model slug is "mazda2"/"mazda3"/"mazda6" — the Ukrainian registry
// (and a bare VIN decode) gives just the digit, mirroring the same quirk in safety.service.ts.
const MAZDA_NUMERIC_MODELS = new Set(['2', '3', '5', '6'])

// BMW's registry model text is a trim/engine code ("320D", "520I", "730D"), while Euro NCAP
// names by chassis series ("3 Series"). The leading digit is BMW's own series identifier.
const BMW_SERIES_RE = /^([1-8])\d{2}/

// Mercedes-Benz's registry model text is likewise a trim code ("E 200", "ML 350"), while
// Euro NCAP names by class. Current classes are a single leading letter (matched generically
// below); legacy nameplates since renamed/consolidated need an explicit alias. Multi-letter
// codes (gl/glk/ml) are matched on the WHOLE leading letter-run, never a shorter prefix of
// it — "gl" must not fire on "GLE 350D" (whose run is "gle"), only on "GL 450" (run "gl"
// exactly) — otherwise GLA/GLB/GLC/GLE/GLS would misresolve to G-Class or GL-Class.
const MERCEDES_LEADING_LETTERS_RE = /^([a-z]+)\d/
const MERCEDES_CLASS_ALIASES: Readonly<Record<string, string>> = {
  a: 'aclass',
  b: 'bclass',
  c: 'cclass',
  e: 'eclass',
  g: 'gclass',
  t: 'tclass',
  x: 'xclass',
  gl: 'gls', // GL-Class -> GLS-Class (2016 rename)
  glk: 'glc', // GLK-Class -> GLC-Class (2015 rename)
  ml: 'gle' // ML-Class -> GLE-Class (2015 rename)
}

/**
 * A second lookup key to retry when the direct make/model match misses — for brands whose
 * registry model text is a trim/engine code rather than the series/class name Euro NCAP
 * indexes by. Exported standalone so this can be unit tested without a DB.
 */
export function brandCandidateKey(mk: string, mdl: string): string | null {
  if (mk === 'mazda' && MAZDA_NUMERIC_MODELS.has(mdl)) return `mazda${mdl}`

  if (mk === 'bmw') {
    const m = BMW_SERIES_RE.exec(mdl)
    return m ? `${m[1]}series` : null
  }

  if (mk === 'mercedesbenz') {
    const letters = MERCEDES_LEADING_LETTERS_RE.exec(mdl)?.[1]
    return letters ? (MERCEDES_CLASS_ALIASES[letters] ?? null) : null
  }

  return null
}
