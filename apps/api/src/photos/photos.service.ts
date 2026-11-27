import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException
} from '@nestjs/common'
import type { VehiclePhotosResponse } from '@carplates/shared'
import { z } from 'zod'

import { DEFAULT_JSON_MAX_BYTES, FetchJsonError, fetchJson } from '../common/fetch-json.js'
import { loadEnv, pixabayEnabled } from '../env.js'

const pixabaySchema = z.object({
  hits: z
    .array(
      z.object({
        id: z.number(),
        pageURL: z.string(),
        tags: z.string(),
        previewURL: z.string(),
        webformatURL: z.string(),
        user: z.string()
      })
    )
    .optional()
})

const CACHE_MAX = 200
const UPSTREAM_TIMEOUT_MS = 10_000

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name)
  private readonly env = loadEnv()
  /** Stock photos for a given brand/model/year don't change day to day — a bounded cache saves quota (Pixabay free tier: 100 req/60s). */
  private readonly cache = new Map<string, VehiclePhotosResponse>()

  async search(brand: string, model: string, year?: number): Promise<VehiclePhotosResponse> {
    if (!pixabayEnabled(this.env)) {
      throw new ServiceUnavailableException('Vehicle photos are not configured')
    }

    const query = [brand, model, year].filter(Boolean).join(' ').trim()
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

    let payload: z.infer<typeof pixabaySchema>
    try {
      payload = await fetchJson(url, pixabaySchema, {
        timeoutMs: UPSTREAM_TIMEOUT_MS,
        maxBytes: DEFAULT_JSON_MAX_BYTES
      })
    } catch (err) {
      if (err instanceof FetchJsonError && err.status === 429) {
        throw new ServiceUnavailableException('Photo search quota exceeded, try again later')
      }
      this.logger.warn(`Pixabay request failed: ${(err as Error).message}`)
      throw new BadGatewayException('Photo search request failed')
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
