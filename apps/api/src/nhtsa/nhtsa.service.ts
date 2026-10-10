import { BadGatewayException, Injectable } from '@nestjs/common'
import type { z } from 'zod'
import type { NhtsaComplaintsResponse, NhtsaRecallsResponse } from '@carplates/shared'

import { loadEnv } from '../env.js'
import { nhtsaModelCandidates } from '../safety/nhtsa-models.js'
import { mapRecalls, summarizeComplaints, upstreamComplaintsSchema, upstreamRecallsSchema } from './nhtsa-parse.js'

const DAY_MS = 24 * 60 * 60 * 1000
/** Campaigns are added rarely, owner complaints keep trickling in but a month-old count is fine for a model-level summary. */
export const RECALLS_TTL_MS = 7 * DAY_MS
export const COMPLAINTS_TTL_MS = 30 * DAY_MS
const CACHE_MAX = 500
const UPSTREAM_TIMEOUT_MS = 10_000

type CacheEntry<T> = { value: T; expiresAt: number }

/**
 * US recall campaigns and owner complaints from NHTSA's live API (public domain), behind a bounded in-memory TTL cache
 * (no table, no ingest — see DATASETS_PLAN.md stage F). Model-level: a US campaign says nothing about a particular
 * Ukrainian car. A failed upstream call is a 502 and is never cached, so the web block simply hides.
 */
@Injectable()
export class NhtsaService {
  private readonly base = loadEnv().NHTSA_SAFETY_RATINGS_BASE_URL
  private readonly recallsCache = new Map<string, CacheEntry<NhtsaRecallsResponse>>()
  private readonly complaintsCache = new Map<string, CacheEntry<NhtsaComplaintsResponse>>()

  async recalls(make: string, model: string, year: number): Promise<NhtsaRecallsResponse> {
    return this.cached(this.recallsCache, RECALLS_TTL_MS, make, model, year, async () => {
      for (const candidate of nhtsaModelCandidates(make, model)) {
        const payload = await this.get('recalls/recallsByVehicle', make, candidate, year, upstreamRecallsSchema)
        if (payload.results.length === 0) continue
        return { make, model, year, matchedModel: candidate, ...mapRecalls(payload.results) }
      }
      return { make, model, year, matchedModel: null, total: 0, recalls: [] }
    })
  }

  async complaints(make: string, model: string, year: number): Promise<NhtsaComplaintsResponse> {
    return this.cached(this.complaintsCache, COMPLAINTS_TTL_MS, make, model, year, async () => {
      for (const candidate of nhtsaModelCandidates(make, model)) {
        const payload = await this.get(
          'complaints/complaintsByVehicle',
          make,
          candidate,
          year,
          upstreamComplaintsSchema
        )
        if (payload.results.length === 0) continue
        return { make, model, year, matchedModel: candidate, ...summarizeComplaints(payload.results) }
      }
      return { make, model, year, matchedModel: null, ...summarizeComplaints([]) }
    })
  }

  private async cached<T>(
    cache: Map<string, CacheEntry<T>>,
    ttlMs: number,
    make: string,
    model: string,
    year: number,
    load: () => Promise<T>
  ): Promise<T> {
    const key = `${year}|${make.toLowerCase()}|${model.toLowerCase()}`
    const hit = cache.get(key)
    if (hit && hit.expiresAt > Date.now()) return hit.value

    const value = await load()
    if (cache.size >= CACHE_MAX) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
    cache.set(key, { value, expiresAt: Date.now() + ttlMs })
    return value
  }

  private async get<S extends z.ZodType>(
    path: string,
    make: string,
    model: string,
    year: number,
    schema: S
  ): Promise<z.infer<S>> {
    const params = new URLSearchParams({ make, model, modelYear: String(year) })
    try {
      const res = await fetch(`${this.base}/${path}?${params.toString()}`, {
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      })
      const body: unknown = await res.json().catch(() => null)
      // NHTSA answers an unknown make/model/year with HTTP 400 and an empty `results` list — that is "no match", not a failure.
      const emptyMatch = res.status === 400 && Array.isArray((body as { results?: unknown } | null)?.results)
      if (!res.ok && !emptyMatch) throw new Error(`status ${res.status}`)
      return schema.parse(body)
    } catch (err) {
      throw new BadGatewayException(`NHTSA request failed: ${(err as Error).message}`)
    }
  }
}
