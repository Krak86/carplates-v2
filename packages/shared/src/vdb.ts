import { z } from 'zod'

/**
 * GET /api/vdb — what the VehiclesDB catalog (CC-BY 4.0, vehiclesdb.com) says about a registry make/model: where
 * else it is sold and how popular it is across markets. Own file, not `schemas.ts`, so adding it does not bust
 * users' offline caches.
 */
export const vdbMatchSchema = z.object({
  makeName: z.string(),
  modelName: z.string(),
  /** How the registry model reached the catalog row — "prefix"/"series" are looser than "exact". */
  how: z.enum(['exact', 'alias', 'series', 'prefix']),
  bodyTypes: z.array(z.string()),
  /** Lowercase ISO 3166-1 alpha-2 codes of every register the model appears in (Ukraine included). */
  countries: z.array(z.string()),
  /** 1 (most popular) .. 10, mean of per-country deciles; null = not ranked. */
  globalDecile: z.number().int().min(1).max(10).nullable(),
  /** Sold in Ukraine's register and nowhere else. */
  uaOnly: z.boolean(),
  /** The catalog files the model under another make than the registry (Renault Dokker = Dacia Dokker). */
  crossMake: z.boolean().default(false),
  /** Other names the catalog knows the model by (Latin script only: "Rabbit" for the Golf). */
  aliases: z.array(z.string()).default([])
})
export type VdbMatchInfo = z.infer<typeof vdbMatchSchema>

export const vdbResponseSchema = z.object({
  brand: z.string(),
  model: z.string(),
  match: vdbMatchSchema.nullable()
})
export type VdbResponse = z.infer<typeof vdbResponseSchema>

/** One model row of the /stats markets panel. */
export const vdbStatsModelSchema = z.object({
  make: z.string(),
  model: z.string(),
  decile: z.number().int().nullable(),
  countries: z.array(z.string()),
  n: z.number()
})
export type VdbStatsModel = z.infer<typeof vdbStatsModelSchema>

/** GET /api/vdb/stats — registry passenger cars rolled up by VehiclesDB popularity (rebuilt by `pnpm db:refresh-vdb-stats`). */
export const vdbStatsResponseSchema = z.object({
  total: z.number(),
  /** Cars whose make/model has a catalog match. */
  matched: z.number(),
  /** Matched cars the catalog ranks (the decile chart's base). */
  ranked: z.number(),
  /** Matched cars of models sold only in Ukraine's register. */
  uaOnly: z.number(),
  /** Cars per decile 1..10 (every decile present, zero when empty). */
  byDecile: z.array(z.object({ decile: z.number().int(), n: z.number() })),
  /** Models common here but ranked in the bottom third elsewhere, most cars first. */
  rareElsewhere: z.array(vdbStatsModelSchema),
  /** Models only the Ukrainian register lists, most cars first. */
  uaOnlyModels: z.array(vdbStatsModelSchema)
})
export type VdbStatsResponse = z.infer<typeof vdbStatsResponseSchema>
