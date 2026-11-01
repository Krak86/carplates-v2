import { VEHICLE_CONFLICT_FIELDS } from '@carplates/shared'
import type { AuctionListLot, AuctionSource, AuctionVehicle } from '@carplates/shared'

/** Prozorro structured props beat the SETAM title parse; a source not listed is never read. */
const SOURCE_PRECEDENCE: readonly AuctionSource[] = ['prozorro', 'setam']

type Fact = string | number | boolean | null | undefined

const present = (v: Fact): v is string | number | boolean => v !== null && v !== undefined && v !== ''

/** Same make / model written differently (`Renault ` vs `RENAULT`) is not a disagreement. */
const sameValue = (a: string | number, b: string | number): boolean =>
  typeof a === 'string' && typeof b === 'string' ? a.trim().toLowerCase() === b.trim().toLowerCase() : a === b

/**
 * One `vehicle` block for the lots of a lookup (newest first, as the service returns them): per field the first present value
 * in source order (Prozorro, then SETAM), inside one source the newest lot. Lots are never merged, only their facts.
 * Make / model / year where the sources give different values are listed in `conflicts`, the shown value stays the winner.
 * Null without lots.
 */
export function mergeVehicle(lots: readonly AuctionListLot[]): AuctionVehicle | null {
  if (lots.length === 0) return null

  const ordered = SOURCE_PRECEDENCE.flatMap(source => lots.filter(l => (l.source ?? 'setam') === source))
  const pick = <K extends keyof AuctionListLot>(key: K): Exclude<AuctionListLot[K], null | undefined> | null => {
    const lot = ordered.find(l => present(l[key] as Fact))
    return (lot?.[key] as Exclude<AuctionListLot[K], null | undefined> | undefined) ?? null
  }

  const conflicts: AuctionVehicle['conflicts'] = []
  for (const field of VEHICLE_CONFLICT_FIELDS) {
    const values: { source: AuctionSource; value: string | number }[] = []
    for (const source of SOURCE_PRECEDENCE) {
      const lot = ordered.find(l => (l.source ?? 'setam') === source && present(l[field]))
      const value = lot?.[field]
      if (present(value) && typeof value !== 'boolean') values.push({ source, value })
    }
    const [first, ...rest] = values
    if (first && rest.some(v => !sameValue(first.value, v.value))) conflicts.push({ field, values })
  }

  return {
    plate: pick('plate'),
    vin: pick('vin'),
    make: pick('make'),
    model: pick('model'),
    year: pick('year'),
    color: pick('color'),
    kilometrage: pick('kilometrage'),
    fuel: pick('fuel'),
    engineCc: pick('engineCc'),
    transmission: pick('transmission'),
    condition: pick('condition'),
    damaged: pick('damaged'),
    damageText: pick('damageText'),
    conflicts
  }
}
