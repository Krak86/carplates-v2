import { z } from 'zod'

const countSchema = z.number().int().nonnegative()
const entrySchema = z.object({ value: z.string(), n: countSchema })

/**
 * GET /api/stats/region-facets: per plate region the biggest passenger-car models and brand home countries (up to 5, biggest
 * first), the fuel-class split (`electric` | `hybrid` | `petrol` | `diesel` | `gas` | `hydrogen`) and the whole passenger
 * fleet, so a share can be shown. `region` = the Ukrainian `REGIONS` name; `origin` values are country codes at the model year.
 */
export const regionFacetStatsResponseSchema = z.object({
  regions: z.array(
    z.object({
      region: z.string(),
      fleet: countSchema,
      models: z.array(entrySchema),
      fuels: z.array(entrySchema),
      origins: z.array(entrySchema)
    })
  )
})
export type RegionFacetStatsResponse = z.infer<typeof regionFacetStatsResponseSchema>
