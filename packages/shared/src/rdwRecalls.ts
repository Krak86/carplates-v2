import { z } from 'zod'

/** Machine translation of a campaign's free-text fields into one language (`uk` | `ru` | `en`); a field is null when it had no text. */
export const rdwRecallTranslationSchema = z.object({
  defect: z.string().nullable(),
  consequences: z.string().nullable(),
  remedy: z.string().nullable(),
  /** Engine that produced it (`nllb-600m` …): shown as "AI translation", never as RDW's wording. */
  engine: z.string()
})
export type RdwRecallTranslation = z.infer<typeof rdwRecallTranslationSchema>

/**
 * One recall campaign from RDW's open data (CC0). The texts are RDW's own Dutch wording — there is no open translation —
 * so the UI labels them as such. A campaign covers a make/type for every vehicle the producer built to that spec: it
 * says nothing about whether a particular car (least of all a Ukrainian one) is affected.
 */
export const rdwRecallSchema = z.object({
  /** RDW reference code (MGP070060 …). */
  code: z.string(),
  /** Country / market the campaign comes from (`NL` = RDW, EU market); more arrive with other sources. Optional for old caches. */
  market: z.string().optional(),
  /** ISO date RDW published the campaign, if recorded. */
  publishedAt: z.string().nullable(),
  producer: z.string().nullable(),
  /** The defect, as RDW words it (Dutch). */
  defect: z.string().nullable(),
  /** RDW's defect category ("Motorrijtuigen en aanhangwagens - stuurinrichting"). */
  category: z.string().nullable(),
  consequences: z.string().nullable(),
  remedy: z.string().nullable(),
  moreInfoUrl: z.string().nullable(),
  /** Hazard texts (RDW, Dutch): "Brand met letselschade" … */
  hazards: z.array(z.string()),
  /** Vehicles in the campaign worldwide / in the Netherlands, as the producer reported them. */
  vehiclesTotal: z.number().int().nullable(),
  vehiclesNational: z.number().int().nullable(),
  /** Machine translations by language code (`uk`, `ru`, `en`), only where every present field has one. Optional for old caches. */
  translations: z.record(z.string(), rdwRecallTranslationSchema).optional()
})
export type RdwRecall = z.infer<typeof rdwRecallSchema>

/**
 * GET /api/rdw/recalls — recall campaigns RDW lists for a registry make/model (every year of it: campaigns carry no
 * model-year). EU market, model level. Own file, not `schemas.ts`, so it does not bust users' offline caches.
 */
export const rdwRecallsResponseSchema = z.object({
  brand: z.string(),
  model: z.string(),
  match: z
    .object({
      makeName: z.string(),
      modelName: z.string(),
      how: z.enum(['exact', 'alias', 'series', 'prefix']),
      crossMake: z.boolean(),
      /** All campaigns found for the model; `recalls` holds the newest `RDW_RECALLS_LIMIT` of them. */
      total: z.number().int(),
      recalls: z.array(rdwRecallSchema)
    })
    .nullable()
})
export type RdwRecallsResponse = z.infer<typeof rdwRecallsResponseSchema>

/** How many campaigns the API sends per model (newest first); the count above it is still reported. */
export const RDW_RECALLS_LIMIT = 30
