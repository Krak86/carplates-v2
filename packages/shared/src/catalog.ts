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

/**
 * Per make year, the same lists as `CatalogStats` (each year's top few): the input of the generation stats. Keys are make years;
 * `n` is the year's car count.
 */
export const catalogYearStatsSchema = z.object({
  byYear: z.record(
    z.string(),
    z.object({
      n: z.number(),
      fuel: countsSchema,
      body: countsSchema,
      color: countsSchema,
      regions: countsSchema
    })
  )
})
export type CatalogYearStats = z.infer<typeof catalogYearStatsSchema>

type YearSums = {
  n: number
  fuel: [string, number][]
  body: [string, number][]
  color: [string, number][]
  regions: [string, number][]
}

/** Adds up the years `from..to` (`to` null = open end) of a model's per-year stats; each list is biggest first. */
export function sumYearStats(stats: CatalogYearStats, from: number, to: number | null): YearSums {
  const sums = {
    n: 0,
    fuel: new Map<string, number>(),
    body: new Map<string, number>(),
    color: new Map<string, number>(),
    regions: new Map<string, number>()
  }
  for (const [year, row] of Object.entries(stats.byYear)) {
    const y = Number(year)
    if (y < from || y > (to ?? Infinity)) continue
    sums.n += row.n
    for (const key of ['fuel', 'body', 'color', 'regions'] as const) {
      for (const [label, n] of row[key]) sums[key].set(label, (sums[key].get(label) ?? 0) + n)
    }
  }
  const ranked = (m: Map<string, number>): [string, number][] => [...m].sort((a, b) => b[1] - a[1])
  return {
    n: sums.n,
    fuel: ranked(sums.fuel),
    body: ranked(sums.body),
    color: ranked(sums.color),
    regions: ranked(sums.regions)
  }
}

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

/** One make on the `/cars` index and the head of a `/cars/:make` page. */
export const catalogMakeSummarySchema = z.object({
  /** Slug (the URL): `bmw`. */
  make: z.string(),
  makeName: z.string(),
  /** Current passenger cars of the make (every model with a page). */
  n: z.number(),
  modelCount: z.number(),
  /** The most common raw registry spelling of the make's biggest model: the input of `BrandLogo`. */
  topBrand: z.string(),
  /** At least one model page of the make is indexable, so the make page is too (else `noindex`). */
  indexable: z.boolean()
})
export type CatalogMakeSummary = z.infer<typeof catalogMakeSummarySchema>

/** `GET /api/catalog/makes`: every make, biggest first. */
export const catalogMakesSchema = z.object({ makes: z.array(catalogMakeSummarySchema) })
export type CatalogMakes = z.infer<typeof catalogMakesSchema>

/** `GET /api/catalog/:make`: the make and all its model pages, biggest first. */
export const catalogMakeSchema = catalogMakeSummarySchema.extend({
  models: z.array(catalogSiblingSchema.extend({ yearMin: z.number().nullable(), yearMax: z.number().nullable() }))
})
export type CatalogMake = z.infer<typeof catalogMakeSchema>

/** A catalog URL part: lower-case letters and digits, optional hyphens (`mercedes-benz`, `3series`). */
export const catalogSlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

export const catalogMakeParamsSchema = z.object({ make: catalogSlugSchema })
export type CatalogMakeParams = z.infer<typeof catalogMakeParamsSchema>

export const catalogParamsSchema = z.object({ make: catalogSlugSchema, model: catalogSlugSchema })
export type CatalogParams = z.infer<typeof catalogParamsSchema>

export const CATALOG_INDEX_PATH = '/cars'
export const catalogMakePath = (make: string): string => `${CATALOG_INDEX_PATH}/${make}`
export const catalogPath = (make: string, model: string): string => `${catalogMakePath(make)}/${model}`

/** `GET /api/catalog/lookup`: a raw registry or VIN-decoded brand + model, resolved to the page that exists for it. */
export const catalogLookupQuerySchema = z.object({
  brand: z.string().trim().min(1).max(64),
  model: z.string().trim().min(1).max(96)
})
export type CatalogLookupQuery = z.infer<typeof catalogLookupQuerySchema>

/** `page` is null when the model has no catalog page (below `CATALOG_KEEP_MIN_CARS`, a non-passenger kind or an unknown spelling). */
export const catalogLookupSchema = z.object({
  page: z.object({ make: z.string(), model: z.string() }).nullable()
})
export type CatalogLookup = z.infer<typeof catalogLookupSchema>
