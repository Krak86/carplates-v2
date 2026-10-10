import { z } from 'zod'

/**
 * One Canadian safety recall from Transport Canada's Vehicle Recalls Database (Open Government Licence - Canada), kept only
 * when no US (NHTSA) campaign looks like the same recall. The text is Transport Canada's own English wording ("Issue: …
 * Safety Risk: … Corrective Actions: …"). A campaign covers the Canadian-market vehicles built to that spec: it says nothing
 * about whether a particular car (least of all a Ukrainian one) is affected.
 */
export const caRecallSchema = z.object({
  /** Transport Canada recall number (2019090). */
  code: z.string(),
  /** ISO date of the recall, if recorded. */
  publishedAt: z.string().nullable(),
  /** TC's notification type: `Safety Mfr`, `Safety TC`, `Service Campaign Mfr`. */
  notification: z.string().nullable(),
  /** Vehicle category ("Car", "SUV", "Light Truck & Van"). */
  category: z.string().nullable(),
  /** Affected system ("Brakes", "Airbag", "Engine"). */
  system: z.string().nullable(),
  /** The manufacturer's own campaign number. */
  manufacturerNo: z.string().nullable(),
  text: z.string().nullable(),
  /** Vehicles in the campaign (Canada), as reported. */
  units: z.number().int().nullable(),
  /** Model years of the matched model the campaign covers (empty = not recorded). */
  years: z.array(z.number().int())
})
export type CaRecall = z.infer<typeof caRecallSchema>

/**
 * GET /api/ca/recalls — Canadian recall campaigns without a US twin for a registry make/model (and model year when given).
 * Persisted reference data (`pnpm ingest:ca-recalls`). Own file, not `schemas.ts`, so it does not bust users' offline caches.
 */
export const caRecallsResponseSchema = z.object({
  brand: z.string(),
  model: z.string(),
  year: z.number().int().nullable(),
  match: z
    .object({
      makeName: z.string(),
      modelName: z.string(),
      how: z.enum(['exact', 'alias', 'series', 'prefix']),
      crossMake: z.boolean(),
      /** All campaigns found; `recalls` holds the newest `CA_RECALLS_LIMIT` of them. */
      total: z.number().int(),
      recalls: z.array(caRecallSchema)
    })
    .nullable()
})
export type CaRecallsResponse = z.infer<typeof caRecallsResponseSchema>

/** How many campaigns the API sends per model (newest first); the count above it is still reported. */
export const CA_RECALLS_LIMIT = 30
