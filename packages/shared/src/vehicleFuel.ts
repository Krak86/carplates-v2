/**
 * `registry.current_registration.fuel` is free text and, unlike `color`/`kind`, isn't a clean
 * one-value-per-row enum — besides these five base fuels it also carries hybrid combos
 * ("ЕЛЕКТРО АБО БЕНЗИН", "БЕНЗИН, ГАЗ АБО ЕЛЕКТРО") and unknown/absent markers ("НЕ ВИЗНАЧЕНО",
 * "ВІДСУТНЄ", "."). Matching by keyword substring (not an exact-value map) means a combo
 * resolves to every fuel it contains, and any new source spelling of a known fuel still
 * matches as long as it contains the same Ukrainian root word.
 */
/** Order matters: `resolveFuelCategories` filters in this order, so a combo's categories — and any icon stacked per category (see apps/web's ResultCard.helpers.ts) — come out in this order too. */
export const VEHICLE_FUELS = ['electric', 'petrol', 'diesel', 'gas', 'hydrogen'] as const

export type VehicleFuel = (typeof VEHICLE_FUELS)[number]

/**
 * Single source of truth for both directions: `resolveFuelCategories` (raw -> canonical, for
 * display and for matching) and `fuelKeyword` (canonical -> raw substring, for building a
 * search filter) both derive from this one map — never hand-duplicated.
 */
const FUEL_KEYWORD_BY_CATEGORY: Readonly<Record<VehicleFuel, string>> = {
  electric: 'ЕЛЕКТРО',
  petrol: 'БЕНЗИН',
  diesel: 'ДИЗЕЛЬНЕ',
  gas: 'ГАЗ',
  hydrogen: 'ВОДЕНЬ'
}

/** The Ukrainian substring that identifies a canonical fuel category in the raw registry text — for building a search filter (ILIKE `%keyword%`). */
export function fuelKeyword(fuel: VehicleFuel): string {
  return FUEL_KEYWORD_BY_CATEGORY[fuel]
}

/** Every canonical fuel category present in a raw registry `fuel` value — more than one for a hybrid combo, `[]` if unrecognized/absent. */
export function resolveFuelCategories(fuel: string | null | undefined): VehicleFuel[] {
  if (!fuel) return []
  return VEHICLE_FUELS.filter(category => fuel.includes(FUEL_KEYWORD_BY_CATEGORY[category]))
}
