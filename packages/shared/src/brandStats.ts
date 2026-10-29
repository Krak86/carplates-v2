import { z } from 'zod'

/** GET /api/stats/brands: the biggest raw registry brands (passenger cars and the rest) by distinct plates, biggest first. */
export const brandStatsResponseSchema = z.object({
  brands: z.array(z.object({ brand: z.string(), n: z.number().int().nonnegative() }))
})
export type BrandStatsResponse = z.infer<typeof brandStatsResponseSchema>
