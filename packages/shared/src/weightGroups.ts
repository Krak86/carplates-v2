import { resolveVehicleKind, type VehicleKind } from './vehicleKind.js'

/** The tabs of the /stats heaviest / lightest panel: "all" plus one tab per group of registry vehicle kinds. */
export const WEIGHT_GROUPS = ['all', 'passenger', 'truck', 'bus', 'motorcycle', 'trailer', 'other'] as const
export type WeightGroup = (typeof WEIGHT_GROUPS)[number]

/** A real vehicle group — every tab except "all". */
export type WeightKindGroup = Exclude<WeightGroup, 'all'>

export const DEFAULT_WEIGHT_GROUP: WeightGroup = 'all'

const GROUP_BY_KIND: Readonly<Record<VehicleKind, WeightKindGroup>> = {
  passenger: 'passenger',
  truck: 'truck',
  bus: 'bus',
  motorcycle: 'motorcycle',
  moped: 'motorcycle',
  quad: 'motorcycle',
  tricycle: 'motorcycle',
  motoTricycle: 'motorcycle',
  trailer: 'trailer',
  semiTrailer: 'trailer',
  specialized: 'other',
  special: 'other',
  undetermined: 'other'
}

/** The weight-board group of a raw registry `kind` value, or null when the kind is absent or unknown. */
export function weightGroupOfKind(kind: string | null | undefined): WeightKindGroup | null {
  const resolved = resolveVehicleKind(kind)
  return resolved ? GROUP_BY_KIND[resolved] : null
}
