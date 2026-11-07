import { Injectable, Logger } from '@nestjs/common'
import { adminCloudflareResponseSchema } from '@carplates/shared'
import type { AdminCloudflareResponse } from '@carplates/shared'
import { z } from 'zod'

import { cloudflareAnalyticsEnabled, loadEnv } from '../env.js'

const CACHE_MS = 10 * 60_000
const DAYS = 30
const ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql'

const QUERY = `
  query ($zone: String!, $since: Date!, $until: Date!) {
    viewer {
      zones(filter: { zoneTag: $zone }) {
        httpRequests1dGroups(limit: ${DAYS + 1}, filter: { date_geq: $since, date_leq: $until }, orderBy: [date_ASC]) {
          dimensions { date }
          sum { requests cachedRequests }
          uniq { uniques }
        }
      }
    }
  }`

const responseSchema = z.object({
  data: z
    .object({
      viewer: z.object({
        zones: z.array(
          z.object({
            httpRequests1dGroups: z.array(
              z.object({
                dimensions: z.object({ date: z.string() }),
                sum: z.object({ requests: z.number(), cachedRequests: z.number() }),
                uniq: z.object({ uniques: z.number() })
              })
            )
          })
        )
      })
    })
    .nullable(),
  errors: z.array(z.object({ message: z.string() })).nullish()
})

const isoDay = (d: Date): string => d.toISOString().slice(0, 10)

@Injectable()
export class CloudflareService {
  private readonly logger = new Logger(CloudflareService.name)
  private cache: { at: number; value: AdminCloudflareResponse } | null = null

  async summary(): Promise<AdminCloudflareResponse> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value

    const env = loadEnv()
    if (!cloudflareAnalyticsEnabled(env)) {
      return adminCloudflareResponseSchema.parse({ configured: false, error: null, days: [] })
    }

    try {
      const until = new Date()
      const since = new Date(until.getTime() - (DAYS - 1) * 86_400_000)
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: QUERY,
          variables: { zone: env.CLOUDFLARE_ZONE_ID, since: isoDay(since), until: isoDay(until) }
        }),
        signal: AbortSignal.timeout(15_000)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = responseSchema.parse(await res.json())
      const first = body.errors?.[0]
      if (first) throw new Error(first.message)
      const groups = body.data?.viewer.zones[0]?.httpRequests1dGroups ?? []
      const value = adminCloudflareResponseSchema.parse({
        configured: true,
        error: null,
        days: groups.map(g => ({
          date: g.dimensions.date,
          requests: g.sum.requests,
          cachedRequests: g.sum.cachedRequests,
          visitors: g.uniq.uniques
        }))
      })
      this.cache = { at: Date.now(), value }
      return value
    } catch (err) {
      this.logger.warn(`Cloudflare analytics failed: ${String(err)}`)
      return adminCloudflareResponseSchema.parse({
        configured: true,
        error: `Cloudflare query failed (${err instanceof Error ? err.message : 'unknown'})`,
        days: []
      })
    }
  }
}
