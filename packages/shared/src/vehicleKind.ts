/**
 * `registry.current_registration.kind` is free text from the source registry, but unlike
 * `body` (150+ granular values with year-dependent suffix codes) it only ever takes one of
 * these 13 exact values — confirmed against the full real ingest. Exact-match (not
 * keyword-match, unlike fuel) is therefore safe and precise.
 */
export const VEHICLE_KINDS = [
  'passenger',
  'truck',
  'bus',
  'motorcycle',
  'moped',
  'trailer',
  'semiTrailer',
  'quad',
  'tricycle',
  'motoTricycle',
  'specialized',
  'special',
  'undetermined'
] as const

export type VehicleKind = (typeof VEHICLE_KINDS)[number]

const KIND_BY_SOURCE_VALUE: Readonly<Record<string, VehicleKind>> = {
  ЛЕГКОВИЙ: 'passenger',
  ВАНТАЖНИЙ: 'truck',
  АВТОБУС: 'bus',
  МОТОЦИКЛ: 'motorcycle',
  МОПЕД: 'moped',
  ПРИЧІП: 'trailer',
  НАПІВПРИЧІП: 'semiTrailer',
  КВАДРОЦИКЛ: 'quad',
  ТРИЦИКЛ: 'tricycle',
  МОТОТРИЦИКЛ: 'motoTricycle',
  СПЕЦІАЛІЗОВАНІ: 'specialized',
  СПЕЦІАЛЬНІ: 'special',
  НЕВИЗНАЧЕНИЙ: 'undetermined'
}

/** Canonical kind for a raw registry `kind` value, or `null` if unrecognized/absent. */
export function resolveVehicleKind(kind: string | null | undefined): VehicleKind | null {
  if (!kind) return null
  return KIND_BY_SOURCE_VALUE[kind.trim().toUpperCase()] ?? null
}
