import { z } from 'zod'

/**
 * One generation of a model with its typical outer size (mm): the median of the RDW model-year medians that fall inside the
 * generation's production span, Wikipedia catalogue figures where RDW has none. Own file, not `schemas.ts`, so it does not bust
 * users' offline caches — every figure is `.nullable().optional()`.
 */
export const generationGrowthItemSchema = z.object({
  /** Short code (`Typ NX`, `Mk8`); empty when the source names none. */
  code: z.string(),
  label: z.string(),
  yearFrom: z.number().int(),
  /** Last production year; null = still in production. */
  yearTo: z.number().int().nullable(),
  lengthMm: z.number().int().positive().nullable().optional(),
  widthMm: z.number().int().positive().nullable().optional(),
  wheelbaseMm: z.number().int().positive().nullable().optional()
})
export type GenerationGrowthItem = z.infer<typeof generationGrowthItemSchema>

/** GET /api/generations/growth — every generation of a model, oldest first, with its typical size. `match` is null for an unknown model. */
export const generationGrowthResponseSchema = z.object({
  brand: z.string(),
  model: z.string(),
  match: z
    .object({
      makeName: z.string(),
      modelName: z.string(),
      generations: z.array(generationGrowthItemSchema)
    })
    .nullable()
})
export type GenerationGrowthResponse = z.infer<typeof generationGrowthResponseSchema>
