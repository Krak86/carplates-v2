import { z } from 'zod'

/**
 * GET /api/ria-check/:plate — the free part of AUTO.RIA's "check a car" answer for a plate our registry does not
 * have (mainly pre-2013 registrations). Own file, not `schemas.ts`, so adding it does not bust offline caches.
 */
export const riaCheckResponseSchema = z.object({
  plate: z.string(),
  vin: z.string().nullable().optional(),
  /** Make, model and year as RIA prints them, e.g. "Hummer H3 2008". */
  title: z.string().nullable().optional(),
  year: z.number().int().nullable().optional(),
  /** Fuel and displacement, e.g. "Бензин, 3.7 л" (Ukrainian text from RIA). */
  engine: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  ownersCount: z.number().int().nullable().optional(),
  /** ISO date (YYYY-MM-DD) of the last registration operation. */
  lastOperationDate: z.string().nullable().optional(),
  lastOperationName: z.string().nullable().optional(),
  /** Where the visitor can run (and pay for) the full check. */
  sourceUrl: z.string()
})
export type RiaCheckResponse = z.infer<typeof riaCheckResponseSchema>

export const RIA_CHECK_URL = 'https://auto.ria.com/uk/check-car/'
