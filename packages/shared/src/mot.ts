import { z } from 'zod'

/**
 * UK MOT "Common faults" (stage G): DVSA anonymised MOT results (OGL v3), aggregated per make / model / model year /
 * mileage band. Own file, not `schemas.ts`, so it does not bust users' offline caches.
 */

/** Vehicle kinds the MOT data speaks for: DVSA test class 4 = car, 7 = van, 1 and 2 = motorcycle. */
export const MOT_KINDS = ['car', 'van', 'motorcycle'] as const
export type MotKind = (typeof MOT_KINDS)[number]

/** Fewer tests than this in a mileage band (or model-year window) is drawn as "not enough data". */
export const MOT_MIN_BAND_TESTS = 200

/** A make/model needs this many normal tests (all years pooled) to be stored at all. */
export const MOT_MIN_KEY_TESTS = 200

/** DVSA reports miles; every stored and shown figure is kilometres. */
export const MILES_TO_KM = 1.609344

/** Lower edge of each mileage band in km, per kind (motorcycles ride far less); the last band is open-ended. */
export const MOT_BAND_EDGES_KM: Readonly<Record<MotKind, readonly number[]>> = {
  car: [0, 25_000, 50_000, 75_000, 100_000, 150_000, 200_000, 250_000],
  van: [0, 25_000, 50_000, 75_000, 100_000, 150_000, 200_000, 250_000],
  motorcycle: [0, 5_000, 10_000, 20_000, 35_000, 50_000]
}

/** Index of the band holding `km`. */
export function motBandOf(kind: MotKind, km: number): number {
  const edges = MOT_BAND_EDGES_KM[kind]
  let band = 0
  for (let i = 1; i < edges.length; i++) if (km >= edges[i]!) band = i
  return band
}

/** Most bands any kind has — the width of the per-band arrays. */
export const MOT_MAX_BANDS = 8

/** Stable group codes (the DVSA top-level names differ per class and between the pre- and post-2018 trees). */
export const MOT_GROUP_CODES = [
  'brakes',
  'tyres',
  'wheels',
  'suspension',
  'steering',
  'lamps',
  'visibility',
  'body',
  'exhaust',
  'seatbelts',
  'speedometer',
  'identification',
  'towbar',
  'other'
] as const
export type MotGroupCode = (typeof MOT_GROUP_CODES)[number]

/** Per band: share of the band's tests, or null when the band has fewer than `MOT_MIN_BAND_TESTS` tests. */
const shareSchema = z.number().min(0).max(1).nullable()

export const motBandSchema = z.object({
  /** Normal tests in the band (the sample behind every share). */
  tests: z.number().int(),
  failRate: shareSchema,
  /** Tests with at least one advisory ("worn, still legal"). */
  watchRate: shareSchema,
  /** Tests that failed with at least one item DVSA classes as dangerous. */
  dangerousRate: shareSchema.nullish(),
  /** The same fail rate for every model of this kind together (the UK average). */
  baselineFailRate: shareSchema
})
export type MotBand = z.infer<typeof motBandSchema>

/** One problem (a group or a specific reason): per band, the share of tests that failed / carried an advisory for it. */
export const motIssueSchema = z.object({
  code: z.string(),
  fail: z.array(shareSchema),
  watch: z.array(shareSchema),
  /** Tests with the issue over the whole model (all bands) — orders the list. */
  failTests: z.number().int(),
  watchTests: z.number().int(),
  /** Uk average for the group, per band (groups only). */
  baselineFail: z.array(shareSchema).nullish(),
  baselineWatch: z.array(shareSchema).nullish()
})
export type MotIssue = z.infer<typeof motIssueSchema>

export const motReasonSchema = motIssueSchema.extend({
  group: z.enum(MOT_GROUP_CODES),
  /** DVSA's English wording: the part ("Brake pads"), the fault ("less than 1.5 mm thick") and the milder advisory. */
  item: z.string(),
  failText: z.string(),
  watchText: z.string()
})
export type MotReason = z.infer<typeof motReasonSchema>

/** GET /api/mot — MOT statistics for a registry make / model (UK inspections of that model, never of this car). */
export const motResponseSchema = z.object({
  brand: z.string(),
  model: z.string(),
  year: z.number().int(),
  match: z
    .object({
      makeName: z.string(),
      modelName: z.string(),
      kind: z.enum(MOT_KINDS),
      how: z.enum(['exact', 'alias', 'series', 'prefix']),
      crossMake: z.boolean(),
      /** Years of DVSA test files pooled. */
      testYears: z.tuple([z.number().int(), z.number().int()]),
      /** Mileage band lower edges in km (length = number of bands). */
      edgesKm: z.array(z.number()),
      /** Normal tests of the model, all years. */
      tests: z.number().int(),
      /** Model years behind the "fail rate by mileage" chart; `widened` when the car's own years were too thin. */
      window: z.object({ from: z.number().int(), to: z.number().int(), widened: z.boolean() }),
      bands: z.array(motBandSchema),
      groups: z.array(motIssueSchema),
      reasons: z.array(motReasonSchema)
    })
    .nullable()
})
export type MotResponse = z.infer<typeof motResponseSchema>
