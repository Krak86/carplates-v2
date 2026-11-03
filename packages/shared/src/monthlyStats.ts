import { z } from 'zod'

const countSchema = z.number().int().nonnegative()

/** The registry operation groups the monthly trend splits on (see `stats_by_month`). */
export const MONTHLY_GROUPS = ['new', 'import', 'resale'] as const
export type MonthlyGroup = (typeof MONTHLY_GROUPS)[number]

/**
 * GET /api/stats/monthly - registry operations per calendar month (`YYYY-MM`, ascending, last 24 months with data):
 * first registrations of new vehicles, used imports and resales (changes of owner). All vehicle kinds.
 */
export const monthlyStatsResponseSchema = z.object({
  months: z.array(
    z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), new: countSchema, import: countSchema, resale: countSchema })
  )
})
export type MonthlyStatsResponse = z.infer<typeof monthlyStatsResponseSchema>
