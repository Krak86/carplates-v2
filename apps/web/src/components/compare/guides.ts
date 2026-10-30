import { resolveFuelCategories } from '@carplates/shared'

import {
  BODY_TYPES_PATH,
  ELECTRIC_PATH,
  EXTREMES_PATH,
  FLEET_PATH,
  FUEL_PATH,
  GENERATIONS_PATH,
  IMPORTS_PATH,
  RECALLS_PATH,
  SAFETY_PATH,
  SIZES_PATH,
  VIN_PATH
} from '@/routes/read/links'
import type { GuidePath } from '@/routes/read/links'

import type { CompareCar, CompareGroup } from './types'

/** The /read articles that explain a table group (the same ones the plate card's sections link to). */
const GROUP_GUIDES: Readonly<Record<CompareGroup, readonly GuidePath[]>> = {
  overview: [GENERATIONS_PATH],
  engine: [EXTREMES_PATH],
  size: [SIZES_PATH, BODY_TYPES_PATH],
  economy: [FUEL_PATH, ELECTRIC_PATH],
  price: [IMPORTS_PATH],
  safety: [SAFETY_PATH],
  reliability: [RECALLS_PATH],
  ukraine: [FLEET_PATH],
  exact: [VIN_PATH]
}

/** Either car runs on electricity: only then the EV article is worth a link. */
export const anyElectric = (cars: readonly (CompareCar | null)[]): boolean =>
  cars.some(car => resolveFuelCategories(car?.fuel).includes('electric'))

/**
 * Guides per shown group, each article once on the page (the first group that wants it keeps it).
 * Groups not in `shown` (empty or still loading) do not claim a guide.
 */
export function guidesByGroup(
  shown: readonly CompareGroup[],
  electric: boolean
): Partial<Record<CompareGroup, readonly GuidePath[]>> {
  const seen = new Set<GuidePath>()
  const result: Partial<Record<CompareGroup, readonly GuidePath[]>> = {}
  for (const group of shown) {
    const fresh = GROUP_GUIDES[group].filter(g => (g !== ELECTRIC_PATH || electric) && !seen.has(g))
    fresh.forEach(g => seen.add(g))
    if (fresh.length > 0) result[group] = fresh
  }
  return result
}
