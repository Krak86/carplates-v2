import { z } from 'zod'

/**
 * `registry.current_registration.body` is free text with 150+ granular values and a year-dependent licence-category
 * suffix ("СЕДАН", "СЕДАН-B", "МІКРОАВТОБУС МЕДДОПОМОГА"), so the advanced-search filter is a substring match on the raw
 * text with autocomplete over the real values (ranked by `stats_by_body`). Lives here, not in schemas.ts, whose hash
 * busts users' offline caches.
 */
export const bodySuggestionSchema = z.object({
  body: z.string(),
  distinctPlates: z.number().int().nonnegative()
})
export type BodySuggestion = z.infer<typeof bodySuggestionSchema>

/** GET /api/search/bodies?q= — top-10 matching raw body values by distinctPlates. */
export const bodySuggestionsResponseSchema = z.object({ suggestions: z.array(bodySuggestionSchema) })
export type BodySuggestionsResponse = z.infer<typeof bodySuggestionsResponseSchema>
