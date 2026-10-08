import { resolveBodyCategory, resolveFuelCategories } from '@carplates/shared'
import type { BodyCategory, VehicleFuel } from '@carplates/shared'

export const BODY_ICON: Readonly<Record<BodyCategory, string>> = {
  fire: '🚒',
  ambulance: '🚑',
  operational: '🚨',
  tow: '🪝',
  service: '🔧',
  crane: '🏗️',
  lift: '🪜',
  concrete: '🧱',
  garbage: '🗑️',
  roadwork: '🚧',
  sewage: '🚽',
  water: '💧',
  food: '🥛',
  dangerous: '☣️',
  tanker: '🛢️',
  refrigerated: '🧊',
  bread: '🍞',
  livestock: '🐄',
  grain: '🌾',
  timber: '🪵',
  carCarrier: '🚗',
  container: '📦',
  boatTrailer: '🚤',
  camper: '🏕️',
  hearse: '⚰️',
  limousine: '🥂',
  schoolBus: '🎒',
  accessible: '♿',
  shiftBus: '👷',
  armored: '🛡️',
  training: '🎓',
  lab: '🔬',
  drilling: '⛏️',
  excavator: '🚜',
  equipment: '⚙️',
  power: '⚡',
  dump: '🪨',
  convertible: '☀️',
  pickup: '🛻',
  kitchen: '🍳',
  shop: '🛒',
  radio: '📡'
}

/** Icon + i18n key of the description for a special-purpose body, or `null` for generic bodies (СЕДАН, ФУРГОН …). */
export function getBodyInfo(body: string | null | undefined): { icon: string; descriptionKey: string } | null {
  const category = resolveBodyCategory(body)
  return category ? { icon: BODY_ICON[category], descriptionKey: `body.cat.${category}` } : null
}

export const FUEL_ICON: Readonly<Record<VehicleFuel, string>> = {
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
