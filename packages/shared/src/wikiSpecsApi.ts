import { z } from 'zod'

/**
 * GET /api/wikispecs — Wikipedia catalogue figures for the generation a registry make/model/year belongs to (stage K):
 * the engine list plus dimensions / mass / tank where RDW has no row for the model. Own file, not `schemas.ts`, so it does
 * not bust users' offline caches — every field is `.nullable().optional()` and read defensively.
 */
export const wikiSourceSchema = z.object({
  /** Wikipedia edition (`en`, `ru`, `de` …). */
  lang: z.string(),
  /** Article title in that edition. */
  title: z.string()
})
export type WikiSource = z.infer<typeof wikiSourceSchema>

export const wikiEngineSchema = z.object({
  displacementCc: z.number().nullable().optional(),
  cylinders: z.number().nullable().optional(),
  powerKw: z.number().nullable().optional(),
  /** Top of a power range; null / absent when the power is a single value. */
  powerKwMax: z.number().nullable().optional(),
  fuel: z.string().nullable().optional(),
  /** The row's own text when the numbers could not be read unambiguously. */
  raw: z.string().nullable().optional(),
  chassisCodes: z.array(z.string()).nullable().optional(),
  /** Present (maybe empty) when the source header named the code column: then both code lists are exact, no shape guess. */
  engineCodes: z.array(z.string()).nullable().optional(),
  note: z.string().nullable().optional(),
  years: z.string().nullable().optional()
})
export type WikiEngineView = z.infer<typeof wikiEngineSchema>

export const wikiDimensionsSchema = z.object({
  wheelbaseMm: z.number().nullable().optional(),
  lengthMm: z.number().nullable().optional(),
  widthMm: z.number().nullable().optional(),
  heightMm: z.number().nullable().optional(),
  kerbKg: z.number().nullable().optional(),
  fuelTankL: z.number().nullable().optional()
})
export type WikiDimensions = z.infer<typeof wikiDimensionsSchema>

export const wikiSpecsResponseSchema = z.object({
  brand: z.string(),
  model: z.string(),
  year: z.number().int().nullable(),
  /** Null when the model, the generation or any figure is unknown: the section is hidden. */
  match: z
    .object({
      makeName: z.string(),
      modelName: z.string(),
      how: z.enum(['exact', 'alias', 'series', 'prefix']),
      crossMake: z.boolean(),
      generationLabel: z.string().nullable().optional(),
      generationCode: z.string().nullable().optional(),
      yearFrom: z.number().int(),
      yearTo: z.number().int().nullable().optional(),
      dimensions: wikiDimensionsSchema.nullable().optional(),
      /** Edition and article the dimensions come from. */
      dimensionsSource: wikiSourceSchema.nullable().optional(),
      engines: z.array(wikiEngineSchema).nullable().optional(),
      enginesSource: wikiSourceSchema.nullable().optional(),
      layout: z.string().nullable().optional(),
      transmission: z.string().nullable().optional(),
      driveSource: wikiSourceSchema.nullable().optional()
    })
    .nullable()
})
export type WikiSpecsResponse = z.infer<typeof wikiSpecsResponseSchema>
export type WikiSpecsMatch = NonNullable<WikiSpecsResponse['match']>

/** Wikipedia article URL for a source (`ua` is the app's code for the `uk` edition). */
export function wikiSourceUrl(source: WikiSource): string {
  const lang = source.lang === 'ua' ? 'uk' : source.lang
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(source.title.replace(/ /g, '_'))}`
}
