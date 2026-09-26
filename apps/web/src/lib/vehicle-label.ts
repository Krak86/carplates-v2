type VehicleLabelInfo = { brand: string | null; model: string | null; year: number | null; color: string | null }

/**
 * "BRAND MODEL (YEAR), COLOR" — the History/Favorites label, stored once at record time
 * (see SearchRoute's recordVisit and ResultCard's FavoriteButton) so the list can render
 * it without re-fetching the vehicle's registry data.
 */
export function formatVehicleLabel(v: VehicleLabelInfo): string | null {
  const car = [v.brand, v.model].filter(Boolean).join(' ')
  const carWithYear = car && v.year ? `${car} (${v.year})` : car
  return [carWithYear || null, v.color].filter(Boolean).join(', ') || null
}
