import type { VinDecodeResponse } from '@carplates/shared'

type VehicleInfo = { brand: string | null; model: string | null; year: number | null }

/** Prefer our own registry data when we have it; otherwise fall back to the NHTSA decode fields. */
export function extractVehicleInfo(data: VinDecodeResponse): VehicleInfo {
  const latest = data.registry?.actions[0]
  if (latest) return { brand: latest.brand, model: latest.model, year: latest.makeYear }

  const find = (variable: string): string | null => data.results.find(r => r.variable === variable)?.value ?? null
  const year = find('Model Year')
  return { brand: find('Make'), model: find('Model'), year: year ? Number(year) : null }
}
