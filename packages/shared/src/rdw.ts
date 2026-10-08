import { z } from 'zod'

/** min / median / max of one measure over the Dutch vehicles of a make/model/year; null when RDW gave none. */
const rangeSchema = z.object({ min: z.number(), median: z.number(), max: z.number() }).nullable()

/** One make/model/year aggregate of RDW's open register (CC0). */
export const rdwSpecsSchema = z.object({
  /** Year of first registration in the Netherlands — close to the model year, but imports run later. */
  year: z.number().int(),
  /** How many Dutch-registered vehicles the figures are taken from. */
  n: z.number().int(),
  powerKw: rangeSchema,
  displacementCc: rangeSchema,
  /** Unladen mass (massa ledig voertuig), kg. */
  massKg: rangeSchema,
  /** Combined CO2, g/km — WLTP where the vehicle has it, else the older NEDC figure. */
  co2GKm: rangeSchema
})
export type RdwSpecs = z.infer<typeof rdwSpecsSchema>

/**
 * GET /api/rdw — what the Dutch vehicle register (RDW open data, CC0) says about a registry make/model/year:
 * power, displacement, mass and CO2. EU-spec data, so it may differ from a Ukrainian-market build. Own file, not
 * `schemas.ts`, so adding it does not bust users' offline caches.
 */
export const rdwMatchSchema = z.object({
  makeName: z.string(),
  modelName: z.string(),
  /** How the registry model reached the RDW model — "prefix"/"series" are looser than "exact". */
  how: z.enum(['exact', 'alias', 'series', 'prefix']),
  /** RDW files the model under another make than the registry (Renault Dokker = Dacia Dokker). */
  crossMake: z.boolean(),
  /** False when the asked year has no data and the nearest year within the allowed gap is shown. */
  exactYear: z.boolean(),
  specs: rdwSpecsSchema
})
export type RdwMatchInfo = z.infer<typeof rdwMatchSchema>

export const rdwResponseSchema = z.object({
  brand: z.string(),
  model: z.string(),
  year: z.number().int(),
  match: rdwMatchSchema.nullable()
})
export type RdwResponse = z.infer<typeof rdwResponseSchema>
