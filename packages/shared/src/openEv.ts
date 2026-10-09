import { z } from 'zod'

/**
 * One electric / plug-in hybrid variant from Open EV Data (MIT, OpenChargingCloud/open-ev-data). The upstream file was last
 * edited in 2020, so it knows early-2020s models only. Usable battery and charging figures describe the model as sold in
 * Europe, not a particular Ukrainian car (a US-spec Leaf charges differently).
 */
export const openEvVariantSchema = z.object({
  /** Free-text trim as the source writes it ("40 kWh", "SR+", "22kW-AC"); empty for the base version. */
  variant: z.string(),
  /** `bev` battery-electric, `phev` plug-in hybrid. */
  powertrain: z.enum(['bev', 'phev']),
  releaseYear: z.number().int().nullable(),
  batteryKwh: z.number().nullable(),
  /** Average consumption, kWh per 100 km. */
  consumptionKwh100: z.number().nullable(),
  acMaxKw: z.number().nullable(),
  acPhases: z.number().int().nullable(),
  /** Connector ids as the source writes them: `type1`, `type2`. */
  acPorts: z.array(z.string()),
  /** Null when the model cannot DC fast-charge. */
  dcMaxKw: z.number().nullable(),
  /** `ccs`, `chademo`, `tesla_ccs`, `tesla_suc`. */
  dcPorts: z.array(z.string())
})
export type OpenEvVariant = z.infer<typeof openEvVariantSchema>

/**
 * GET /api/ev — electric variants listed for a registry make/model (every year of it). Own file, not `schemas.ts`, so it
 * does not bust users' offline caches.
 */
export const openEvResponseSchema = z.object({
  brand: z.string(),
  model: z.string(),
  match: z
    .object({
      makeName: z.string(),
      modelName: z.string(),
      how: z.enum(['exact', 'alias', 'series', 'prefix']),
      crossMake: z.boolean(),
      variants: z.array(openEvVariantSchema)
    })
    .nullable()
})
export type OpenEvResponse = z.infer<typeof openEvResponseSchema>
