import {
  plateHistoryResponseSchema,
  plateLookupResponseSchema,
  plateRecognizeResponseSchema,
  statsResponseSchema,
  vinDecodeResponseSchema
} from '@carplates/shared'
import type {
  PlateHistoryResponse,
  PlateLookupResponse,
  PlateRecognizeResponse,
  StatsResponse,
  VinDecodeResponse
} from '@carplates/shared'

const BASE = import.meta.env.VITE_API_BASE ?? ''

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
