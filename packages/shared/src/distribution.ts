import { z } from 'zod'

/** Metrics the fleet histograms cover; the unit and bucket width live with the rebuild in scripts/src/spec-stats.ts. */
export const DISTRIBUTION_METRICS = ['power_kw', 'hp_per_tonne', 'displacement_cc'] as const
export type DistributionMetric = (typeof DISTRIBUTION_METRICS)[number]

/** `[bucket lower edge, cars]` pairs in ascending bucket order, plus the bucket width. */
const histogramSchema = z.object({
  width: z.number().positive(),
  buckets: z.array(z.tuple([z.number(), z.number()]))
})

export const distributionResponseSchema = z.object({
  power_kw: histogramSchema,
  hp_per_tonne: histogramSchema,
  displacement_cc: histogramSchema
})
export type DistributionResponse = z.infer<typeof distributionResponseSchema>
export type Histogram = z.infer<typeof histogramSchema>

/** Bucket widths per metric — one place for the rebuild (SQL) and the reader (percentile maths). */
export const DISTRIBUTION_BUCKET_WIDTH: Record<DistributionMetric, number> = {
  power_kw: 5,
  hp_per_tonne: 10,
  displacement_cc: 100
}

/**
 * Share (0-1) of the fleet strictly below `value`, interpolating inside its bucket; null when the histogram is empty.
 * "0.78" reads as "stronger than 78 % of registered passenger cars".
 */
export function percentileOf(histogram: Histogram, value: number): number | null {
  const total = histogram.buckets.reduce((sum, [, n]) => sum + n, 0)
  if (total === 0) return null
  let below = 0
  for (const [edge, n] of histogram.buckets) {
    if (value >= edge + histogram.width) below += n
    else if (value >= edge) below += n * ((value - edge) / histogram.width)
  }
  return Math.min(1, below / total)
}
