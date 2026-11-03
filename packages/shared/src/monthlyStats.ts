import { z } from 'zod'

const countSchema = z.number().int().nonnegative()

/** The registry operation groups the monthly trend splits on (see `stats_by_month`). */
export const MONTHLY_GROUPS = ['new', 'import', 'resale'] as const
export type MonthlyGroup = (typeof MONTHLY_GROUPS)[number]

const groupCountsSchema = z.object({ new: countSchema, import: countSchema, resale: countSchema })

/**
 * GET /api/stats/monthly - registry operations per calendar month (`YYYY-MM`, ascending, last 24 months with data):
 * first registrations of new vehicles, used imports and resales (changes of owner). `new` / `import` / `resale` cover all
 * vehicle kinds; `cars` is the same split for passenger cars only (absent from an older API or before the rollup is rebuilt).
 */
export const monthlyStatsResponseSchema = z.object({
  months: z.array(
    groupCountsSchema.extend({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      cars: groupCountsSchema.nullable().optional()
    })
  )
})
export type MonthlyStatsResponse = z.infer<typeof monthlyStatsResponseSchema>
