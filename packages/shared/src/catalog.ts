import { z } from 'zod'

/**
 * Model catalog contract (`/api/catalog/...`, `/cars/:make/:model`). Its own file, not `schemas.ts`, so adding a field
 * never discards saved offline data (CLAUDE.md "Offline / PWA"): new fields are `.nullable().optional()`.
 */

/** A model page is `indexable` with at least this many current cars (thin pages stay reachable but `noindex`). */
export const CATALOG_MIN_CARS = 200
/** The MVP indexes only this many biggest models; widen once Search Console shows indexing. */
export const CATALOG_TOP_MODELS = 300
/** Models below this many current cars get no catalog row at all (404). */
export const CATALOG_KEEP_MIN_CARS = 50

/** `[label, count]` pairs, biggest first. */
const countsSchema = z.array(z.tuple([z.string(), z.number()]))

/** The registry rollup of one model: the "In Ukraine" section. Every list is capped and sorted by count. */
export const catalogStatsSchema = z.object({
  /** Cars by `make_year`, oldest first. */
  years: countsSchema,
  /** Cars by the year of their latest registration (imports show up as spikes), oldest first. */
  registered: countsSchema,
  fuel: countsSchema,
  body: countsSchema,
  color: countsSchema,
  regions: countsSchema,
  /** Median engine capacity (cm³) and power (kW) of the cars that state them. */
  capacityP50: z.number().nullable().optional(),
  powerP50: z.number().nullable().optional()
})
export type CatalogStats = z.infer<typeof catalogStatsSchema>

export const catalogSiblingSchema = z.object({
  model: z.string(),
  modelName: z.string(),
  n: z.number()
})
export type CatalogSibling = z.infer<typeof catalogSiblingSchema>

export const catalogModelSchema = z.object({
  /** Slugs (the URL): `bmw` / `3series`. */
  make: z.string(),
  model: z.string(),
  makeName: z.string(),
  modelName: z.string(),
  /** Current passenger cars of the model. */
  n: z.number(),
  yearMin: z.number().nullable(),
  yearMax: z.number().nullable(),
  /** The most common raw registry spelling: the input of every `ResultCard` section. */
  topBrand: z.string(),
  topModel: z.string(),
  /** Dominant raw `kind` value; the sections' kind filter. */
  kind: z.string(),
  indexable: z.boolean(),
  stats: catalogStatsSchema,
  /** The biggest other models of the make, for plain internal links. */
  siblings: z.array(catalogSiblingSchema)
})
export type CatalogModel = z.infer<typeof catalogModelSchema>

/** A catalog URL part: lower-case letters and digits, optional hyphens (`mercedes-benz`, `3series`). */
export const catalogSlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

export const catalogParamsSchema = z.object({ make: catalogSlugSchema, model: catalogSlugSchema })
export type CatalogParams = z.infer<typeof catalogParamsSchema>

export const catalogPath = (make: string, model: string): string => `/cars/${make}/${model}`
