import { z } from 'zod'

/**
 * Whether a plate / VIN is in the National Police list of vehicles wanted for unlawful taking (open data, CC BY, data.gov.ua).
 * The feed holds only current records, so the ingest keeps every record it has seen: `status: 'removed'` = it left the feed
 * (found, or the search was cancelled — the feed does not say which). Own file: no offline-cache bust when it grows.
 */
export const wantedRecordSchema = z.object({
  id: z.string(),
  status: z.enum(['wanted', 'removed']),
  /** Which of the queried keys the record matched: the plate, the VIN or both. */
  matchedBy: z.enum(['plate', 'vin', 'both']),
  plate: z.string().nullable(),
  vin: z.string().nullable(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  vehicleType: z.string().nullable(),
  color: z.string().nullable(),
  /** ISO date of the unlawful taking. */
  seizedAt: z.string().nullable(),
  /** ISO date the police recorded the search. */
  registeredAt: z.string().nullable(),
  organUnit: z.string().nullable(),
  /** ISO timestamp of the first of our runs that no longer saw the record; null while wanted. */
  removedAt: z.string().nullable(),
  /** `stolen.in.ua` for records from the scraped history (since Aug 2020); absent / `feed` = our own feed snapshots. */
  source: z.enum(['feed', 'stolen.in.ua']).nullable().optional(),
  /** False when only the month of the removal is known (`removedAt` is the scrape time, not the real date). */
  removedExact: z.boolean().nullable().optional()
})
export type WantedRecord = z.infer<typeof wantedRecordSchema>

/**
 * A wanted licence PLATE (Garpun list, National Police open data, CC BY): only the plate is wanted, no VIN / brand. Not proof that
 * this car is stolen (plates get lost or cloned). Same history model as the vehicle records.
 */
export const wantedPlateSchema = z.object({
  id: z.string(),
  status: z.enum(['wanted', 'removed']),
  plate: z.string(),
  /** ISO date the plate was reported (the feed also holds a few absurd dates: those come as null). */
  seizedAt: z.string().nullable(),
  /** ISO date the police recorded it. */
  insertedAt: z.string().nullable(),
  organUnit: z.string().nullable(),
  /** ISO timestamp of the first of our runs that no longer saw the plate; null while wanted. */
  removedAt: z.string().nullable()
})
export type WantedPlate = z.infer<typeof wantedPlateSchema>

export const wantedResponseSchema = z.object({
  /** At least one matching record is still on the list. */
  wanted: z.boolean(),
  /** Currently wanted records first, then removed ones; newest taking first within each. */
  records: z.array(wantedRecordSchema),
  /** ISO timestamp of the last ingest that completed; null if the list was never loaded. */
  checkedAt: z.string().nullable(),
  /** Earliest first-seen timestamp we hold — removals before it were not tracked. */
  trackedSince: z.string().nullable(),
  /** Set when `trackedSince` comes from the scraped stolen.in.ua history (attribution on the card). */
  historySource: z.literal('stolen.in.ua').nullable().optional(),
  /** Garpun list: records for the queried plate (the VIN is never matched), currently wanted first. Absent in old cached responses. */
  plates: z.array(wantedPlateSchema).nullable().optional(),
  /** At least one Garpun record is still on the list (kept apart from `wanted`, which is the vehicle list only). */
  plateWanted: z.boolean().nullable().optional(),
  /** ISO timestamp of the newest Garpun ingest run (own clock: `checkedAt` belongs to the vehicle list). Only for plate lookups. */
  platesCheckedAt: z.string().nullable().optional(),
  /** Earliest first-seen timestamp of the Garpun list: removals before it were not tracked (no scraped history exists for Garpun). */
  platesTrackedSince: z.string().nullable().optional()
})
export type WantedResponse = z.infer<typeof wantedResponseSchema>

/** One row of a `/api/wanted/stats` breakdown: `stolen` = every record, `found` = removed from the list, `wanted` = still on it. */
export const wantedStatsRowSchema = z.object({
  label: z.string(),
  stolen: z.number(),
  found: z.number(),
  wanted: z.number()
})
export type WantedStatsRow = z.infer<typeof wantedStatsRowSchema>

export const wantedStatsVehicleSchema = z.object({
  brand: z.string().nullable(),
  model: z.string().nullable(),
  vehicleType: z.string().nullable(),
  color: z.string().nullable(),
  plate: z.string().nullable(),
  seizedAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  region: z.string().nullable()
})
export type WantedStatsVehicle = z.infer<typeof wantedStatsVehicleSchema>

/** Aggregates for the `/wanted` page. Own contract: new fields must be `.nullable().optional()`. */
export const wantedStatsResponseSchema = z.object({
  summary: z.object({
    wantedNow: z.number(),
    foundTotal: z.number(),
    /** Found records whose removal our own feed snapshots saw (exact date). */
    foundSinceTracking: z.number(),
    withPlate: z.number(),
    withVin: z.number(),
    /** Median days from theft to removal over exact removal dates only. */
    medianDaysToFound: z.number().nullable(),
    /** ISO date of the earliest scraped theft (stolen.in.ua history). */
    historySince: z.string().nullable()
  }),
  /** Theft year, ascending (label = year). */
  byYear: z.array(wantedStatsRowSchema),
  byRegion: z.array(wantedStatsRowSchema),
  byBrand: z.array(wantedStatsRowSchema),
  byModel: z.array(wantedStatsRowSchema),
  byType: z.array(wantedStatsRowSchema),
  byColor: z.array(wantedStatsRowSchema),
  recentStolen: z.array(wantedStatsVehicleSchema),
  recentFound: z.array(wantedStatsVehicleSchema),
  /** Newest `last_seen_at` of the feed: when the data was last refreshed. */
  checkedAt: z.string().nullable()
})
export type WantedStatsResponse = z.infer<typeof wantedStatsResponseSchema>

/** stolen.in.ua per-plate page (Latin plate) — the link-out for a manual check. */
export const stolenInUaUrl = (plateLatin: string): string => `https://stolen.in.ua/v/${encodeURIComponent(plateLatin)}`

/** data.gov.ua pages of the two police lists (the card links to both). */
export const WANTED_VEHICLES_DATASET_URL = 'https://data.gov.ua/dataset/2cd12755-834b-4c43-9026-fe356ce93af5'
export const WANTED_PLATES_DATASET_URL = 'https://data.gov.ua/dataset/licplatewanted'
