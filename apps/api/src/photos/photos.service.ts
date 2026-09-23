import { BadGatewayException, BadRequestException, HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import type { VehiclePhotosResponse } from '@carplates/shared'

import { loadEnv, pixabayEnabled } from '../env.js'

interface PixabayHit {
  id: number
  pageURL: string
  tags: string
  previewURL: string
  webformatURL: string
  user: string
}

const CACHE_MAX = 200
const UPSTREAM_TIMEOUT_MS = 10_000

@Injectable()
export class PhotosService {
  private readonly env = loadEnv()
  /** Stock photos for a given brand/model/year don't change day to day — a bounded cache saves quota (Pixabay free tier: 100 req/60s). */
  private readonly cache = new Map<string, VehiclePhotosResponse>()

  async search(brand: string, model: string, year?: number): Promise<VehiclePhotosResponse> {
    if (!pixabayEnabled(this.env)) {
      throw new ServiceUnavailableException('Vehicle photos are not configured')
    }

    const query = [brand, model, year]
      .filter(Boolean)
      .join(' ')
      .trim()
    if (query.length < 3) {
      throw new BadRequestException('Need a brand or model to search photos')
    }

    const cached = this.cache.get(query)
    if (cached) return cached

    const url = new URL(this.env.PIXABAY_BASE_URL)
    url.searchParams.set('key', this.env.PIXABAY_API_KEY as string)
    url.searchParams.set('q', query)
    url.searchParams.set('image_type', 'photo')
    url.searchParams.set('category', 'transportation')
    url.searchParams.set('orientation', 'horizontal')
    url.searchParams.set('safesearch', 'true')
    url.searchParams.set('per_page', '20')

    let payload: { hits?: PixabayHit[] }
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) })
      if (res.status === 429) throw new ServiceUnavailableException('Photo search quota exceeded, try again later')
      if (!res.ok) throw new Error(`status ${res.status}`)
      payload = (await res.json()) as { hits?: PixabayHit[] }
    } catch (err) {
      if (err instanceof HttpException) throw err // don't let this swallow the mapping above
      throw new BadGatewayException(`Pixabay request failed: ${(err as Error).message}`)
    }

    const images = (payload.hits ?? []).map(hit => ({
      id: hit.id,
      previewURL: hit.previewURL,
      webformatURL: hit.webformatURL,
      pageURL: hit.pageURL,
      tags: hit.tags,
      user: hit.user
    }))

    const response: VehiclePhotosResponse = { query, images }
    this.remember(query, response)
    return response
  }

  private remember(query: string, value: VehiclePhotosResponse): void {
    if (this.cache.size >= CACHE_MAX) {
      const oldest = this.cache.keys().next().value
      if (oldest !== undefined) this.cache.delete(oldest)
    }
    this.cache.set(query, value)
  }
}
