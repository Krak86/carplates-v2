/**
 * `registry.current_registration.purpose` ("призначення") is free text from the source registry but only ever takes
 * one of these 3 exact values -- confirmed against the full real ingest (~15.1M general, ~1.5M specialized, ~115k special).
 * Exact-match is therefore safe.
 */
export const VEHICLE_PURPOSES = ['general', 'specialized', 'special'] as const

export type VehiclePurpose = (typeof VEHICLE_PURPOSES)[number]

const PURPOSE_SOURCE_VALUES: Readonly<Record<VehiclePurpose, string>> = {
  general: 'ЗАГАЛЬНИЙ',
  specialized: 'СПЕЦІАЛІЗОВАНИЙ',
  special: 'СПЕЦІАЛЬНИЙ'
}

/** The raw registry `purpose` value for a canonical purpose -- for building a search filter (`eq`). */
export function sourceValueForPurpose(purpose: VehiclePurpose): string {
  return PURPOSE_SOURCE_VALUES[purpose]
}
