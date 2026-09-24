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
  const key = model.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
  return key || null
}
