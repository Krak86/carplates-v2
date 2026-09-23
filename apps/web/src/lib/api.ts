import {
  plateHistoryResponseSchema,
  plateLookupResponseSchema,
  plateRecognizeResponseSchema,
  statsResponseSchema,
  vehiclePhotosResponseSchema,
  vinDecodeResponseSchema
} from '@carplates/shared'
import type {
  PlateHistoryResponse,
  PlateLookupResponse,
  PlateRecognizeResponse,
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

export async function getVehiclePhotos(brand: string, model: string, year: number | null): Promise<VehiclePhotosResponse> {
  const params = new URLSearchParams()
  if (brand) params.set('brand', brand)
  if (model) params.set('model', model)
  if (year != null) params.set('year', String(year))
  return vehiclePhotosResponseSchema.parse(await getJson(`/api/photos?${params.toString()}`))
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
