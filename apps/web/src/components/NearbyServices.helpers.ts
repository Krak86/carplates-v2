export const NEARBY_CATEGORIES = ['mechanic', 'dealer', 'insurance'] as const
export type NearbyCategory = (typeof NEARBY_CATEGORIES)[number]

export const DEFAULT_NEARBY_CATEGORY: NearbyCategory = 'mechanic'

export const NEARBY_CATEGORY_ICON: Record<NearbyCategory, string> = {
  mechanic: '🔧',
  dealer: '🚘',
  insurance: '🛡️'
}

/** i18n key of the Google Maps search text — a brand-specific dealer search only when the brand is known. */
export function nearbyQueryKey(category: NearbyCategory, brand: string | null): string {
  if (category === 'dealer' && !brand) return 'nearby.query.dealerAny'
  return `nearby.query.${category}`
}

// ~100 m precision is plenty for a "nearby" search and avoids handing Google an exact position.
export function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000
}
