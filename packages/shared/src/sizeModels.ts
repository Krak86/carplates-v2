import { z } from 'zod'

/**
 * One Ukrainian passenger model for the /read explainers and the size explorer: registry fleet size, dominant registry
 * body, RDW's usual body type (raw Dutch key) and catalogue dimensions in mm. Every figure but `n` may be missing.
 */
export const sizeModelSchema = z.object({
  brand: z.string(),
  model: z.string(),
  n: z.number().int().nonnegative(),
  body: z.string().nullable().optional(),
  rdwBody: z.string().nullable().optional(),
  lengthMm: z.number().int().positive().nullable().optional(),
  widthMm: z.number().int().positive().nullable().optional(),
  heightMm: z.number().int().positive().nullable().optional(),
  wheelbaseMm: z.number().int().positive().nullable().optional()
})
export type SizeModel = z.infer<typeof sizeModelSchema>

/** GET /api/stats/size-models — every model with at least a few dozen cars, biggest fleets first. */
export const sizeModelsResponseSchema = z.object({ models: z.array(sizeModelSchema) })
export type SizeModelsResponse = z.infer<typeof sizeModelsResponseSchema>
