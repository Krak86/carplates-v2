import type { VinDecodeResponse } from '@carplates/shared'

type VehicleInfo = { brand: string | null; model: string | null; year: number | null; body: string | null }

/**
 * Prefer our own registry data when we have it; otherwise fall back to the NHTSA decode fields.
 * The vPIC decode doesn't carry a body-style field this app already parses, so a VIN with no
 * registry match gets `body: null` — the safe default (see `filterByBodyStyle`), not a guess.
 */
export function extractVehicleInfo(data: VinDecodeResponse): VehicleInfo {
  const latest = data.registry?.actions[0]
  if (latest) return { brand: latest.brand, model: latest.model, year: latest.makeYear, body: latest.body }

  const find = (variable: string): string | null => data.results.find(r => r.variable === variable)?.value ?? null
  const year = find('Model Year')
  return { brand: find('Make'), model: find('Model'), year: year ? Number(year) : null, body: null }
}
