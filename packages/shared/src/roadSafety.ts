import { z } from 'zod'

import { REGION_NAMES } from './regions.js'

/**
 * Road-safety (DTP) contracts, `GET /api/road-safety/*`. Own file, not `schemas.ts`, so new fields do not bust offline caches
 * (new fields are `.nullable().optional()`). Patrol Police tables count crashes with injured / killed only, and the files
 * carry no per-vehicle data: nothing here is a per-model risk. docs/road-safety-plan.md.
 */

const countSchema = z.number().int().nonnegative()

/** The two datasets keep their own year lists: Patrol Police aggregates (2022+) and the yearly hazardous-section CSVs. */
export const HAZARD_KINDS = ['hazard', 'concentration'] as const
export type HazardKind = (typeof HAZARD_KINDS)[number]

/** `period` = last reported month of the file: 12 is a full year, 1..11 a year-to-date file (`partial`). */
export const roadSafetyYearSchema = z.object({
  year: z.number().int(),
  period: z.number().int().min(1).max(12),
  partial: z.boolean()
})
export type RoadSafetyYear = z.infer<typeof roadSafetyYearSchema>

const totalsSchema = z.object({ crashes: countSchema, deaths: countSchema, injured: countSchema })

/** `?year=` of every endpoint: absent = the latest full year (or the latest file when there is no full year). */
export const roadSafetyYearQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional()
})
export type RoadSafetyYearQuery = z.infer<typeof roadSafetyYearQuerySchema>

export const roadSafetyRoadsQuerySchema = roadSafetyYearQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(300).default(50)
})
export type RoadSafetyRoadsQuery = z.infer<typeof roadSafetyRoadsQuerySchema>

export const roadSafetyHazardsQuerySchema = roadSafetyYearQuerySchema.extend({
  region: z
    .string()
    .trim()
    .refine(r => REGION_NAMES.includes(r), 'unknown region')
    .optional(),
  kind: z.enum(HAZARD_KINDS).optional()
})
export type RoadSafetyHazardsQuery = z.infer<typeof roadSafetyHazardsQuerySchema>

/**
 * GET /api/road-safety/regions: per plate region (`REGIONS` name) crashes, deaths and injured of one year, with the registered
 * passenger-car fleet (today's `registrations`, the same for every year; cars, not drivers) and the per-100k rates. `rank*` is
 * 1 = the most deaths / the highest rate among regions with data. Occupied regions are missing from the files in some years.
 */
export const roadSafetyRegionsResponseSchema = z.object({
  year: z.number().int(),
  period: z.number().int(),
  years: z.array(roadSafetyYearSchema),
  national: totalsSchema,
  regions: z.array(
    z.object({
      region: z.string(),
      crashes: countSchema,
      deaths: countSchema,
      injured: countSchema,
      pedestrianCrashes: countSchema.nullable().optional(),
      childCrashes: countSchema.nullable().optional(),
      fleet: countSchema.nullable(),
      deathsPer100k: z.number().nullable(),
      crashesPer100k: z.number().nullable(),
      rankDeaths: z.number().int().positive(),
      rankDeathsPer100k: z.number().int().positive().nullable()
    })
  )
})
export type RoadSafetyRegionsResponse = z.infer<typeof roadSafetyRegionsResponseSchema>

/** GET /api/road-safety/roads: state roads by deaths. `roadCode` is the normalised code (Cyrillic letters, first token). */
export const roadSafetyRoadsResponseSchema = z.object({
  year: z.number().int(),
  period: z.number().int(),
  roads: z.array(
    z.object({
      roadCode: z.string(),
      roadName: z.string(),
      crashes: countSchema,
      deaths: countSchema,
      injured: countSchema
    })
  )
})
export type RoadSafetyRoadsResponse = z.infer<typeof roadSafetyRoadsResponseSchema>

const causeEntrySchema = z.object({ name: z.string(), crashes: countSchema, deaths: countSchema, injured: countSchema })

/** GET /api/road-safety/causes: crash causes and crash types of one year, most deaths first. */
export const roadSafetyCausesResponseSchema = z.object({
  year: z.number().int(),
  period: z.number().int(),
  causes: z.array(causeEntrySchema),
  types: z.array(causeEntrySchema)
})
export type RoadSafetyCausesResponse = z.infer<typeof roadSafetyCausesResponseSchema>

const bucketsSchema = z.array(z.object({ bucket: z.number().int(), crashes: countSchema }))

/** GET /api/road-safety/time: crashes by weekday (1 = Monday .. 7), hour (0..23) and month (1..12); empty when a file lacks one. */
export const roadSafetyTimeResponseSchema = z.object({
  year: z.number().int(),
  period: z.number().int(),
  weekdays: bucketsSchema,
  hours: bucketsSchema,
  months: bucketsSchema
})
export type RoadSafetyTimeResponse = z.infer<typeof roadSafetyTimeResponseSchema>

/**
 * GET /api/road-safety/hazards: hazardous sections and crash concentration places (Infrastructure Restoration Agency, CC BY).
 * `kmStart` / `kmEnd` are metres from the road's zero; coordinates are null when the source value was missing or implausible;
 * `roadCode` is empty for city bypasses without a state road index; `crashes3y` counts the three years before registration.
 */
export const roadSafetyHazardsResponseSchema = z.object({
  year: z.number().int(),
  years: z.array(z.number().int()),
  hazards: z.array(
    z.object({
      kind: z.enum(HAZARD_KINDS),
      region: z.string(),
      roadCode: z.string(),
      roadName: z.string(),
      kmStart: z.number().int().nullable(),
      kmEnd: z.number().int().nullable(),
      lat: z.number().nullable(),
      lon: z.number().nullable(),
      crashes3y: countSchema.nullable(),
      rate: z.number().nullable(),
      hazardLevel: z.string().nullable()
    })
  )
})
export type RoadSafetyHazardsResponse = z.infer<typeof roadSafetyHazardsResponseSchema>
