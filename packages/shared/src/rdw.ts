import { z } from 'zod'

/** min / median / max of one measure over the Dutch vehicles of a make/model/year; null when RDW gave none. */
const rangeSchema = z.object({ min: z.number(), median: z.number(), max: z.number() }).nullable()

/**
 * Stage C2 measures. `optional` as well as nullable: an offline-cached answer from before C2 has no such key at all
 * (the persisted cache is rehydrated without re-parsing), so readers use `?? null`.
 */
const extraRangeSchema = rangeSchema.optional()

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
  co2GKm: rangeSchema,
  /** Permitted maximum (gross) mass, kg — unladen mass plus the load. */
  grossMassKg: extraRangeSchema,
  /** Wheelbase, cm. */
  wheelbaseCm: extraRangeSchema,
  seats: extraRangeSchema,
  doors: extraRangeSchema,
  /** Maximum towed mass with / without trailer brakes, kg. */
  towBrakedKg: extraRangeSchema,
  towUnbrakedKg: extraRangeSchema,
  /**
   * Outer dimensions, cm, and top speed, km/h. RDW fills these for only a third of the cars, so the figures cover
   * the vehicles that have them; the API drops one built from fewer than `RDW_MIN_DISPLAY_N` vehicles.
   */
  lengthCm: extraRangeSchema,
  widthCm: extraRangeSchema,
  heightCm: extraRangeSchema,
  topSpeedKmh: extraRangeSchema
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
