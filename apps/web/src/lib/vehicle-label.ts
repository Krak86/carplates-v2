import { brandLogoUrl } from '@carplates/shared'

type VehicleLabelInfo = { brand: string | null; model: string | null; year: number | null; color: string | null }

/**
 * "BRAND MODEL (YEAR), COLOR" — the History/Favorites label, stored once at record time
 * (see SearchRoute's recordVisit and ResultCard's FavoriteButton) so the list can render
 * it without re-fetching the vehicle's registry data.
 */
const MAX_BRAND_WORDS = 3

/**
 * Recover the brand from a stored label (which joins brand + model with a single space, so the
 * registry's double-space separator is gone): the longest leading run of words that has a
 * bundled logo, e.g. "LAND ROVER DEFENDER (2015)" → "LAND ROVER".
 */
export function brandFromLabel(label: string | null): string | null {
  if (!label) return null
  const words = label.split(' ')
  for (let n = Math.min(MAX_BRAND_WORDS, words.length); n >= 1; n--) {
    const candidate = words.slice(0, n).join(' ')
    if (brandLogoUrl(candidate)) return candidate
  }
  return null
}

export function formatVehicleLabel(v: VehicleLabelInfo): string | null {
  const car = [v.brand, v.model].filter(Boolean).join(' ')
  const carWithYear = car && v.year ? `${car} (${v.year})` : car
  return [carWithYear || null, v.color].filter(Boolean).join(', ') || null
}
