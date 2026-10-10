import { z } from 'zod'

/**
 * Advanced-search "registration status" filter: a vehicle's LATEST registry operation (`current_registration.oper_code`).
 * Filtering is by code — the free-text name has dozens of spelling variants per code — and the dropdown is fed by
 * `stats_by_oper` (one row per code: the most common name + how many vehicles currently sit in that status). Lives here,
 * not in schemas.ts, whose hash busts users' offline caches.
 */
export const operSuggestionSchema = z.object({
  code: z.number().int().nonnegative(),
  name: z.string().nullable(),
  distinctPlates: z.number().int().nonnegative()
})
export type OperSuggestion = z.infer<typeof operSuggestionSchema>

/** GET /api/search/operations — every operation code (~190), most vehicles first. */
export const operSuggestionsResponseSchema = z.object({ operations: z.array(operSuggestionSchema) })
export type OperSuggestionsResponse = z.infer<typeof operSuggestionsResponseSchema>
