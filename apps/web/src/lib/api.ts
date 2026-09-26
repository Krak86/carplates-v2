import {
  cncapRatingsResponseSchema,
  euroNcapRatingsResponseSchema,
  iihsRatingsResponseSchema,
  jncapRatingsResponseSchema,
  kncapRatingsResponseSchema,
  plateHistoryResponseSchema,
  plateLookupResponseSchema,
  plateRecognizeResponseSchema,
  safetyRatingsResponseSchema,
  statsResponseSchema,
  vehiclePhotosResponseSchema,
  vinDecodeResponseSchema
} from '@carplates/shared'
import type {
  CncapRatingsResponse,
  EuroNcapRatingsResponse,
  IihsRatingsResponse,
  JncapRatingsResponse,
  KncapRatingsResponse,
  PlateHistoryResponse,
  PlateLookupResponse,
  PlateRecognizeResponse,
  SafetyRatingsResponse,
  StatsResponse,
  VehiclePhotosResponse,
  VinDecodeResponse
} from '@carplates/shared'
import type { Feature, FeatureCollection, Geometry } from 'geojson'

const BASE = import.meta.env.VITE_API_BASE ?? ''

export type UkraineRegionProperties = { shapeISO: string; shapeName: string }
export type UkraineRegionFeature = Feature<Geometry, UkraineRegionProperties>
export type UkraineGeography = FeatureCollection<Geometry, UkraineRegionProperties>

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function unwrap(res: Response): Promise<unknown> {
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : res.statusText
    throw new ApiError(res.status, message)
  }
  return body
}

async function getJson(path: string): Promise<unknown> {
  return unwrap(await fetch(`${BASE}${path}`, { headers: { accept: 'application/json' } }))
}

export async function lookupPlate(plate: string): Promise<PlateLookupResponse> {
  return plateLookupResponseSchema.parse(await getJson(`/api/plate/${encodeURIComponent(plate)}`))
}

export async function plateHistory(plate: string): Promise<PlateHistoryResponse> {
  return plateHistoryResponseSchema.parse(await getJson(`/api/plate/${encodeURIComponent(plate)}/history`))
}

export async function decodeVin(vin: string): Promise<VinDecodeResponse> {
  return vinDecodeResponseSchema.parse(await getJson(`/api/vin/${encodeURIComponent(vin)}`))
}

export async function getStats(): Promise<StatsResponse> {
  return statsResponseSchema.parse(await getJson('/api/stats'))
}

export async function getVehiclePhotos(
  brand: string,
  model: string,
  year: number | null
): Promise<VehiclePhotosResponse> {
  const params = new URLSearchParams()
  if (brand) params.set('brand', brand)
  if (model) params.set('model', model)
  if (year != null) params.set('year', String(year))
  return vehiclePhotosResponseSchema.parse(await getJson(`/api/photos?${params.toString()}`))
}

export async function getSafetyRatings(make: string, model: string, year: number): Promise<SafetyRatingsResponse> {
  const params = new URLSearchParams({ make, model, year: String(year) })
  return safetyRatingsResponseSchema.parse(await getJson(`/api/safety?${params.toString()}`))
}

// Persisted (scraped), not proxied live — see apps/api/src/safety/euroncap.service.ts.
export async function getEuroNcapRatings(make: string, model: string, year: number): Promise<EuroNcapRatingsResponse> {
  const params = new URLSearchParams({ make, model, year: String(year) })
  return euroNcapRatingsResponseSchema.parse(await getJson(`/api/safety/euroncap?${params.toString()}`))
}

// Persisted (scraped), not proxied live — see apps/api/src/safety/jncap.service.ts.
export async function getJncapRatings(make: string, model: string, year: number): Promise<JncapRatingsResponse> {
  const params = new URLSearchParams({ make, model, year: String(year) })
  return jncapRatingsResponseSchema.parse(await getJson(`/api/safety/jncap?${params.toString()}`))
}

// Persisted (scraped), not proxied live — see apps/api/src/safety/cncap.service.ts.
export async function getCncapRatings(make: string, model: string, year: number): Promise<CncapRatingsResponse> {
  const params = new URLSearchParams({ make, model, year: String(year) })
  return cncapRatingsResponseSchema.parse(await getJson(`/api/safety/cncap?${params.toString()}`))
}

export async function getKncapRatings(make: string, model: string, year: number): Promise<KncapRatingsResponse> {
  const params = new URLSearchParams({ make, model, year: String(year) })
  return kncapRatingsResponseSchema.parse(await getJson(`/api/safety/kncap?${params.toString()}`))
}

export async function getIihsRatings(make: string, model: string, year: number): Promise<IihsRatingsResponse> {
  const params = new URLSearchParams({ make, model, year: String(year) })
  return iihsRatingsResponseSchema.parse(await getJson(`/api/safety/iihs?${params.toString()}`))
}

// Our own transcode-and-cache proxy (the source .wmv can't play in any modern browser).
export function safetyVideoUrl(nhtsaVideoUrl: string): string {
  return `${BASE}/api/safety/video?${new URLSearchParams({ url: nhtsaVideoUrl }).toString()}`
}

// Bundled static asset (apps/web/public/), not an /api/* response — no BASE
// prefix, no Zod (it's our own build artifact, not user-facing API contract).
export async function getUkraineGeography(): Promise<UkraineGeography> {
  const res = await fetch('/ukraine-adm1.geojson', { headers: { accept: 'application/geo+json' } })
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  return res.json() as Promise<UkraineGeography>
}

export async function recognizePlate(file: File): Promise<PlateRecognizeResponse> {
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${BASE}/api/recognize/plate/cloud`, {
    method: 'POST',
    body: form,
    headers: { accept: 'application/json' }
  })
  return plateRecognizeResponseSchema.parse(await unwrap(res))
}
