import { z } from 'zod'

const countSchema = z.number().int().nonnegative()

/**
 * GET /api/stats/region-brands: the biggest passenger-car brands of every plate region (up to 5, biggest first) and the
 * region's whole passenger fleet, so a share can be shown. `region` = the Ukrainian `REGIONS` name.
 */
export const regionBrandStatsResponseSchema = z.object({
  regions: z.array(
    z.object({
      region: z.string(),
      fleet: countSchema,
      brands: z.array(z.object({ brand: z.string(), n: countSchema }))
    })
  )
})
export type RegionBrandStatsResponse = z.infer<typeof regionBrandStatsResponseSchema>
