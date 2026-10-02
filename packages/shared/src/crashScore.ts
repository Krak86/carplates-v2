/**
 * One comparable 0–100 "crash score" across the five persisted NCAP-style sources, for the /safety statistics page.
 * The sources do not share a scale, so each is normalized separately and the per-source scores of the applicable
 * generation are averaged. It is a rough cross-programme comparison, not an official rating.
 */

export const CRASH_SOURCES = ['euroncap', 'jncap', 'cncap', 'kncap', 'iihs'] as const
export type CrashSource = (typeof CRASH_SOURCES)[number]

/** One source's rating for one tested generation, already reduced to a 0–100 score. */
export type ScoredRating = {
  modelKey: string
  /** Rating (or, for IIHS, model) year — compared against the registered car's make year. */
  year: number
  score: number
}

const clamp100 = (v: number): number => Math.max(0, Math.min(100, v))

/** Euro NCAP: 0–5 stars, linear. */
export function euroncapScore(stars: number | null | undefined): number | null {
  return stars == null ? null : clamp100((Math.min(stars, 5) / 5) * 100)
}

/** JNCAP: the published overall percentage; falls back to stars (capped at 5 — 2024+ shows a 6th) when it is missing. */
export function jncapScore(overallPct: number | null | undefined, stars: number | null | undefined): number | null {
  if (overallPct != null) return clamp100(overallPct)
  return stars == null ? null : clamp100((Math.min(stars, 5) / 5) * 100)
}

/** C-NCAP: only the 2018+ percentage scoring is comparable — the older raw-points score has no fixed maximum. */
export function cncapScore(scoreUnit: 'pct' | 'points', overallScore: number | null | undefined): number | null {
  return scoreUnit === 'pct' && overallScore != null ? clamp100(overallScore) : null
}

/** Approximate score of a KNCAP overall class (1 = best) for cars that have no published 0–100 score. */
const KNCAP_CLASS_SCORE: Readonly<Record<number, number>> = { 1: 95, 2: 85, 3: 75, 4: 65, 5: 55 }

/** KNCAP: the published 0–100 overall score, else a fixed estimate from the overall class (1–5). */
export function kncapScore(
  overallScore: number | null | undefined,
  overallClass: number | null | undefined
): number | null {
  if (overallScore != null) return clamp100(overallScore)
  return overallClass == null ? null : (KNCAP_CLASS_SCORE[overallClass] ?? null)
}

/** IIHS crashworthiness tests; crash-prevention, headlights, child-seat anchors and belt reminders are left out. */
const IIHS_CRASH_TESTS = new Set([
  'moderate-overlap-front-original-test',
  'moderate-overlap-front-updated-test',
  'small-overlap-front',
  'small-overlap-front-driver-side',
  'small-overlap-front-passenger-side',
  'side-original-test',
  'side-updated-test',
  'roof-strength',
  'head-restraints-and-seats'
])
const IIHS_RATING_SCORE: Readonly<Record<string, number>> = { Good: 100, Acceptable: 67, Marginal: 33, Poor: 0 }

/** IIHS has no overall number: the mean of its crashworthiness tests (Good 100 … Poor 0); null when none were rated. */
export function iihsScore(tests: readonly { key: string; rating: string | null }[]): number | null {
  const scores = tests.flatMap(t => {
    const s = IIHS_CRASH_TESTS.has(t.key) && t.rating != null ? IIHS_RATING_SCORE[t.rating] : undefined
    return s == null ? [] : [s]
  })
  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
}

/**
 * Reference models are keyed more coarsely than the registry's ("cla" vs "cla250"), so the stored key must be a
 * prefix of the registry key; only the longest such key is kept, so a short unrelated key ("i") never ties with the
 * real one ("i30"). Input rows must already be one make. Same rule as the per-source API lookups.
 */
export function matchRatingRows<T extends { modelKey: string }>(makeRows: readonly T[], mdl: string): T[] {
  const hits = makeRows.filter(r => r.modelKey.length >= 2 && mdl.startsWith(r.modelKey))
  if (hits.length === 0) return hits
  const longest = Math.max(...hits.map(r => r.modelKey.length))
  return hits.filter(r => r.modelKey.length === longest)
}

/**
 * The score of the generation that best applies to a car of `year`: the newest rating published no later than a
 * year after the car (same slack as the result card), averaged over that year's rows (IIHS rates several body
 * variants per model year). Null when every rating is newer than the car.
 */
export function applicableCrashScore(rows: readonly ScoredRating[], year: number): number | null {
  const eligible = rows.filter(r => r.year <= year + 1)
  if (eligible.length === 0) return null
  const newest = Math.max(...eligible.map(r => r.year))
  const picked = eligible.filter(r => r.year === newest)
  return picked.reduce((s, r) => s + r.score, 0) / picked.length
}

/** Equal-weight mean of the sources that have a score — null (and 0 sources) when none do. */
export function combineCrashScores(scores: Partial<Record<CrashSource, number | null>>): {
  score: number | null
  sources: number
} {
  const present = Object.values(scores).filter((v): v is number => v != null)
  if (present.length === 0) return { score: null, sources: 0 }
  return { score: present.reduce((a, b) => a + b, 0) / present.length, sources: present.length }
}

export const CRASH_BANDS = ['green', 'yellow', 'orange', 'red'] as const
export type CrashBand = (typeof CRASH_BANDS)[number]

/** Colour band of a 0–100 crash score (higher = safer). */
export function crashBand(score: number): CrashBand {
  if (score >= 80) return 'green'
  if (score >= 65) return 'yellow'
  if (score >= 50) return 'orange'
  return 'red'
}
