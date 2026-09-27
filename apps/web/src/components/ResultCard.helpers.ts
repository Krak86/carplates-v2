import { resolveFuelCategories } from '@carplates/shared'
import type { VehicleFuel } from '@carplates/shared'

const FUEL_ICON: Readonly<Record<VehicleFuel, string>> = {
  electric: '🔋',
  petrol: '⛽',
  diesel: '🛢️',
  gas: '💨',
  hydrogen: '💧'
}

export const FUEL_ICON_FALLBACK = '❓'

export function getFuelIcon(fuel: string | null | undefined): string {
  const categories = resolveFuelCategories(fuel)
  if (categories.length > 0) return categories.map(category => FUEL_ICON[category]).join('')
  return fuel ? FUEL_ICON_FALLBACK : ''
}

/** False for null/blank and for the unknown/absent/garbage markers ("NULL", "ВІДСУТНЄ", "."). */
export function isKnownFuel(fuel: string | null | undefined): boolean {
  return resolveFuelCategories(fuel).length > 0
}
