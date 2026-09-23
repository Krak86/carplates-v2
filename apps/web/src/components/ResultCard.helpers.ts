/**
 * `fuel` is free text from the source registry, not a fixed enum — besides the five
 * base fuels it also carries hybrid combos ("ЕЛЕКТРО АБО БЕНЗИН", "БЕНЗИН, ГАЗ АБО
 * ЕЛЕКТРО") and unknown/absent markers ("НЕ ВИЗНАЧЕНО", "ВІДСУТНЄ", "."). Matching by
 * keyword (rather than an exact-value map) means a combo shows every fuel it contains,
 * and any new source spelling still resolves to the right icon(s) or the fallback.
 */
const FUEL_ICON_KEYWORDS: ReadonlyArray<{ keyword: string; icon: string }> = [
  { keyword: 'ЕЛЕКТРО', icon: '🔋' },
  { keyword: 'БЕНЗИН', icon: '⛽' },
  { keyword: 'ДИЗЕЛЬНЕ', icon: '🛢️' },
  { keyword: 'ГАЗ', icon: '💨' },
  { keyword: 'ВОДЕНЬ', icon: '💧' }
]

export const FUEL_ICON_FALLBACK = '❓'

function matchedFuelIcons(fuel: string): string[] {
  return FUEL_ICON_KEYWORDS.filter(({ keyword }) => fuel.includes(keyword)).map(({ icon }) => icon)
}

export function getFuelIcon(fuel: string | null | undefined): string {
  if (!fuel) return ''
  const matched = matchedFuelIcons(fuel)
  return matched.length > 0 ? matched.join('') : FUEL_ICON_FALLBACK
}

/** False for null/blank and for the unknown/absent/garbage markers ("NULL", "ВІДСУТНЄ", "."). */
export function isKnownFuel(fuel: string | null | undefined): boolean {
  return !!fuel && matchedFuelIcons(fuel).length > 0
}
