import { z } from 'zod'

/**
 * GET /api/admin/cloudflare - edge traffic from Cloudflare's GraphQL Analytics API (zone `httpRequests1dGroups`).
 * Unique visitors are counted by IP at the edge, so bots and non-JS clients are included (PostHog counts browsers).
 * `configured: false` = no CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID. Own file, not `schemas.ts`, so it does not bust offline caches.
 */
export const adminCloudflareResponseSchema = z.object({
  configured: z.boolean(),
  error: z.string().nullable(),
  /** Oldest first, one row per UTC day, at most 30. */
  days: z.array(
    z.object({
      date: z.string(),
      requests: z.number(),
      cachedRequests: z.number(),
      /** Unique IPs that day. Not summable across days. */
      visitors: z.number()
    })
  )
})
export type AdminCloudflareResponse = z.infer<typeof adminCloudflareResponseSchema>
