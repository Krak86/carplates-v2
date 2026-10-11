import { z } from 'zod'

/**
 * One generation of a model (`FourthGeneration`, `XV40`, `Mk5`) with its production years. Facts from Wikidata (CC0) and
 * Wikipedia (CC BY-SA): credited on About, linked through `wikiTitle`. Own file, not `schemas.ts`, so it does not bust users'
 * offline caches — new fields here are `.nullable().optional()`.
 */
export const generationSchema = z.object({
  /** Short code (`XV40`, `Mk5`, `Typ 1U`); empty when the source names none. */
  code: z.string(),
  /** Display label: the code, or "Second generation". */
  label: z.string(),
  yearFrom: z.number().int(),
  /** Last production year; null = still in production. */
  yearTo: z.number().int().nullable(),
  bodyStyles: z.string(),
  platform: z.string(),
  /** English Wikipedia article (or the series article for heading-derived rows). */
  wikiTitle: z.string()
})
export type Generation = z.infer<typeof generationSchema>

/**
 * GET /api/generations — the generation a registry make/model/year belongs to, with its neighbours. `match` is null when the
 * model is unknown or the year falls outside every known span: nothing is shown on a guess.
 */
export const generationsResponseSchema = z.object({
  brand: z.string(),
  model: z.string(),
  year: z.number().int().nullable(),
  match: z
    .object({
      makeName: z.string(),
      modelName: z.string(),
      how: z.enum(['exact', 'alias', 'series', 'prefix']),
      crossMake: z.boolean(),
      /** The generation containing `year` (the newest when a boundary year fits two); null without a year or a fit. */
      current: generationSchema.nullable(),
      previous: generationSchema.nullable(),
      next: generationSchema.nullable(),
      /** True when `year` is a shared boundary year of `current` and `previous`/`next`, so the pick is a best guess. */
      boundary: z.boolean(),
      total: z.number().int()
    })
    .nullable()
})
export type GenerationsResponse = z.infer<typeof generationsResponseSchema>

/** The generation whose production span contains `year`; the newest of two when a shared boundary year matches both. */
export function pickGeneration<T extends Pick<Generation, 'yearFrom' | 'yearTo'>>(
  list: readonly T[],
  year: number
): T | null {
  const hits = list.filter(g => g.yearFrom <= year && (g.yearTo === null || g.yearTo >= year))
  return [...hits].sort((a, b) => b.yearFrom - a.yearFrom)[0] ?? null
}

/** `2006–2011`, `2020–` for a generation still in production. */
export function generationSpan(g: Pick<Generation, 'yearFrom' | 'yearTo'>): string {
  return g.yearTo === null
    ? `${g.yearFrom}–`
    : g.yearTo === g.yearFrom
      ? String(g.yearFrom)
      : `${g.yearFrom}–${g.yearTo}`
}
