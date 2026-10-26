import { z } from 'zod'

const countSchema = z.number().int().nonnegative()
const countriesSchema = z.array(z.object({ country: z.string(), n: countSchema }))

/**
 * GET /api/stats/origin — passenger cars currently registered by the brand's home country and by the country the VIN
 * says the car was assembled in. `country` is an ISO alpha-2 code or a former state (`SU`, `CSHH`, `DD`, `DE-FRG`, ...)
 * picked by the car's model year, '' = unknown (brand not matched, or no standard VIN). Biggest first, unknown last.
 */
export const originStatsResponseSchema = z.object({
  total: countSchema,
  byBrand: countriesSchema,
  byPlant: countriesSchema
})
export type OriginStatsResponse = z.infer<typeof originStatsResponseSchema>
