import { z } from 'zod'

const countSchema = z.number().int().nonnegative()

/**
 * GET /api/stats/imports — passenger cars currently registered whose history holds a used-import operation (`import`) or a
 * sale through a trade organization (`dealer`, no import). Counted by registration operation, not as a verdict on any car:
 * by year of that operation (oldest first), the import countries read off the VIN (`country` ISO alpha-2, '' = unknown; the
 * country a car was built in, not where it was bought) and the biggest imported models.
 */
export const importsStatsResponseSchema = z.object({
  total: z.object({ import: countSchema, dealer: countSchema }),
  byYear: z.array(z.object({ year: z.number().int(), import: countSchema, dealer: countSchema })),
  byCountry: z.array(z.object({ country: z.string(), n: countSchema })),
  topModels: z.array(z.object({ brand: z.string(), model: z.string(), n: countSchema }))
})
export type ImportsStatsResponse = z.infer<typeof importsStatsResponseSchema>
