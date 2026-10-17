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
  historySource: z.literal('stolen.in.ua').nullable().optional()
})
export type WantedResponse = z.infer<typeof wantedResponseSchema>

/** stolen.in.ua per-plate page (Latin plate) — the link-out for a manual check. */
export const stolenInUaUrl = (plateLatin: string): string => `https://stolen.in.ua/v/${encodeURIComponent(plateLatin)}`
