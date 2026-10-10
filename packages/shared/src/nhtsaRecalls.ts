import { z } from 'zod'

/**
 * One US recall campaign from NHTSA (public domain, `api.nhtsa.gov/recalls/recallsByVehicle`). The texts are NHTSA's own
 * English wording. A campaign covers the US-market vehicles a producer built to that spec: it says nothing about whether a
 * particular car (least of all a Ukrainian one) is affected.
 */
export const nhtsaRecallSchema = z.object({
  /** NHTSA campaign number (15V144000). */
  code: z.string(),
  /** ISO date NHTSA received the report, if parseable. */
  publishedAt: z.string().nullable(),
  producer: z.string().nullable(),
  /** NHTSA's component label ("STEERING:ELECTRIC POWER ASSIST SYSTEM"). */
  component: z.string().nullable(),
  summary: z.string().nullable(),
  consequence: z.string().nullable(),
  remedy: z.string().nullable(),
  /** NHTSA's "do not drive" and "park outside" advisories. */
  parkIt: z.boolean(),
  parkOutside: z.boolean(),
  overTheAirUpdate: z.boolean()
})
export type NhtsaRecall = z.infer<typeof nhtsaRecallSchema>

/**
 * GET /api/nhtsa/recalls — US recall campaigns for a make/model/model-year (live NHTSA API behind a 7-day cache).
 * Own file, not `schemas.ts`, so it does not bust users' offline caches.
 */
export const nhtsaRecallsResponseSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  /** The model spelling NHTSA matched (differs from `model` for "6" → "Mazda6"); null when nothing matched. */
  matchedModel: z.string().nullable(),
  /** All campaigns found; `recalls` holds the newest `NHTSA_RECALLS_LIMIT` of them. */
  total: z.number().int(),
  recalls: z.array(nhtsaRecallSchema)
})
export type NhtsaRecallsResponse = z.infer<typeof nhtsaRecallsResponseSchema>

/** How many campaigns the API sends per vehicle (newest first); the count above it is still reported. */
export const NHTSA_RECALLS_LIMIT = 30

/**
 * GET /api/nhtsa/complaints — an aggregate of NHTSA owner complaints for a make/model/model-year (live API, 30-day
 * cache). Only counts: the free-text narratives carry personal detail and are never forwarded.
 */
export const nhtsaComplaintsResponseSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  matchedModel: z.string().nullable(),
  total: z.number().int(),
  crashes: z.number().int(),
  fires: z.number().int(),
  injuries: z.number().int(),
  deaths: z.number().int(),
  /** Most-complained-about components (a complaint can name several), most frequent first. */
  components: z.array(z.object({ name: z.string(), count: z.number().int() })),
  /** ISO date of the newest complaint filed, if parseable. */
  latestFiled: z.string().nullable()
})
export type NhtsaComplaintsResponse = z.infer<typeof nhtsaComplaintsResponseSchema>

/** How many components the complaints summary lists. */
export const NHTSA_COMPLAINT_COMPONENTS = 5
