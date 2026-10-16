import { z } from 'zod'

const countSchema = z.number().int().nonnegative()

/** Electric and hybrid counts of one model year / region (`bev` = electricity only, `hybrid` = electricity plus a fuel). */
export const evSplitSchema = z.object({ bev: countSchema, hybrid: countSchema })
export type EvSplit = z.infer<typeof evSplitSchema>

/**
 * GET /api/stats/ev — Ukrainian electrified passenger cars: by model year (oldest first), by plate region (biggest first,
 * `fleet` = all passenger cars of the region so a share can be shown) and the biggest pure-electric models.
 */
export const evStatsResponseSchema = z.object({
  total: evSplitSchema,
  fleet: countSchema,
  byYear: z.array(evSplitSchema.extend({ year: z.number().int(), fleet: countSchema })),
  byRegion: z.array(evSplitSchema.extend({ region: z.string(), fleet: countSchema })),
  topModels: z.array(z.object({ brand: z.string(), model: z.string(), n: countSchema, firstYear: z.number().int() }))
})
export type EvStatsResponse = z.infer<typeof evStatsResponseSchema>
