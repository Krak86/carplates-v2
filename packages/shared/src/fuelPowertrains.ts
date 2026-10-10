import { z } from 'zod'

import { FUEL_CLASSES } from './fuelMatch.js'

/**
 * /fuel "Powertrains" panel payload — counts per fuel class from `registry.stats_fuel` (passenger cars only).
 * Own contract file (not `schemas.ts`), so changing it never discards users' offline data.
 * Shares are 0–100. `hybrid` is hybrid and plug-in together: the registry fuel text cannot tell them apart.
 */
export const powertrainModelSchema = z.object({
  brand: z.string(),
  model: z.string(),
  n: z.number().int(),
  /** This model's cars of the class, as a share of the class. */
  classShare: z.number(),
  /** Share of this model's cars (all fuels) that are of the class — 100 for a pure EV model, lower for mixed nameplates. */
  modelShare: z.number()
})
export type PowertrainModel = z.infer<typeof powertrainModelSchema>

export const powertrainBrandSchema = z.object({
  brand: z.string(),
  n: z.number().int(),
  classShare: z.number(),
  /** Share of the brand's cars (all fuels) that are of the class. */
  brandShare: z.number()
})
export type PowertrainBrand = z.infer<typeof powertrainBrandSchema>

export const powertrainYearSchema = z.object({
  year: z.number().int(),
  n: z.number().int(),
  /** Share of all passenger cars of that model year. */
  share: z.number()
})
export type PowertrainYear = z.infer<typeof powertrainYearSchema>

export const powertrainClassSchema = z.object({
  fuelClass: z.enum(FUEL_CLASSES),
  n: z.number().int(),
  /** Share of all passenger cars. */
  share: z.number(),
  /** Distinct brands / brand+model pairs. */
  brands: z.number().int(),
  models: z.number().int(),
  avgCo2: z.number().nullable(),
  topBrand: powertrainBrandSchema.nullable(),
  topModel: powertrainModelSchema.nullable(),
  /** Most common models, largest first. */
  topModels: z.array(powertrainModelSchema),
  topBrands: z.array(powertrainBrandSchema),
  /** Least common models that still have a few cars (single-car rows are mostly registry noise), smallest first. */
  rareModels: z.array(powertrainModelSchema),
  /** Newest model years, newest first — the adoption trend. */
  byYear: z.array(powertrainYearSchema)
})
export type PowertrainClass = z.infer<typeof powertrainClassSchema>

export const powertrainStatsResponseSchema = z.object({
  total: z.number().int(),
  /** Smallest car count a model needs to appear in `rareModels`. */
  rareMinCars: z.number().int(),
  classes: z.array(powertrainClassSchema)
})
export type PowertrainStatsResponse = z.infer<typeof powertrainStatsResponseSchema>
