import { z } from 'zod'

/** One vehicle-registration action from the state open-data registry. */
export const registrationSchema = z.object({
  /** null since the 2026 plate-removal (ГСЦ МВС №67/ОД) — such rows key on `vin` instead. */
  plate: z.string().nullable(),
  person: z.string().nullable(),
  regAddrKoatuu: z.string().nullable(),
  operCode: z.number().int().nullable(),
  operName: z.string().nullable(),
  dReg: z.string().nullable(),
  depCode: z.string().nullable(),
  dep: z.string().nullable(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  vin: z.string().nullable(),
  makeYear: z.number().int().nullable(),
  color: z.string().nullable(),
  kind: z.string().nullable(),
  body: z.string().nullable(),
  purpose: z.string().nullable(),
  fuel: z.string().nullable(),
  capacity: z.number().int().nullable(),
  /** Engine power in kW — 2026+ only; the only engine figure a pure EV has. */
  powerKwt: z.number().int().nullable(),
  ownWeight: z.number().int().nullable(),
  totalWeight: z.number().int().nullable(),
  /** true when `plate` was reconstructed (event/VIN match), not published as-is. */
  plateInferred: z.boolean()
})
export type Registration = z.infer<typeof registrationSchema>

/** GET /api/plate/:plate — latest known registration for a plate. */
export const plateLookupResponseSchema = z.object({
  plate: z.string(),
  region: z.string().nullable(),
  current: registrationSchema,
  historyCount: z.number().int().nonnegative()
})
export type PlateLookupResponse = z.infer<typeof plateLookupResponseSchema>

/** GET /api/plate/:plate/history — every registration action, newest first. */
export const plateHistoryResponseSchema = z.object({
  plate: z.string(),
  region: z.string().nullable(),
  actions: z.array(registrationSchema)
})
export type PlateHistoryResponse = z.infer<typeof plateHistoryResponseSchema>

/** Our own registry rows for a VIN — present when the VIN appears in `registry.registrations`. */
export const vinRegistrySchema = z.object({
  plate: z.string().nullable(),
  plateInferred: z.boolean(),
  actions: z.array(registrationSchema)
})
export type VinRegistry = z.infer<typeof vinRegistrySchema>

/** GET /api/vin/:vin — non-empty variable/value pairs from the NHTSA decoder. */
export const vinDecodeResponseSchema = z.object({
  vin: z.string(),
  results: z.array(z.object({ variable: z.string(), value: z.string() })),
  /** Our own registry data for this VIN, when we have any (undefined otherwise). */
  registry: vinRegistrySchema.optional()
})
export type VinDecodeResponse = z.infer<typeof vinDecodeResponseSchema>

/** One OCR read, already normalized to the canonical plate key. */
export const plateCandidateSchema = z.object({
  plate: z.string(), // canonical Cyrillic, ready for /:query
  raw: z.string(), // provider's raw Latin OCR string
  score: z.number().min(0).max(1)
})
export type PlateCandidate = z.infer<typeof plateCandidateSchema>

/** POST /api/recognize/plate/{cloud,on-prem} — plate reads found in an uploaded photo, best first. */
export const plateRecognizeResponseSchema = z.object({ candidates: z.array(plateCandidateSchema).min(1) })
export type PlateRecognizeResponse = z.infer<typeof plateRecognizeResponseSchema>

/** Typed error body returned by the API exception filter. */
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string()
})
export type ApiError = z.infer<typeof apiErrorSchema>
