const STAR_FILLED = '★'
const STAR_EMPTY = '☆'

/** NHTSA ratings are usually "1".."5", but sometimes "Not Rated" — render whichever applies. */
export function formatStars(rating: string | null): string {
  const n = rating != null ? Number(rating) : NaN
  if (!Number.isInteger(n) || n < 1 || n > 5) return rating ?? '—'
  return STAR_FILLED.repeat(n) + STAR_EMPTY.repeat(5 - n)
}

/** First available crash-test photo across front/side/pole tests, for a compact preview. */
export function firstPicture(rating: {
  frontCrashPicture: string | null
  sideCrashPicture: string | null
  sidePolePicture: string | null
}): string | null {
  return rating.frontCrashPicture ?? rating.sideCrashPicture ?? rating.sidePolePicture ?? null
}

/** NHTSA sends rollover risk as a fraction (0.109) — render as a percentage. */
export function formatPercent(value: number | null): string | null {
  if (value == null) return null
  return `${(value * 100).toFixed(1)}%`
}

/** "1".."5" → 1-5; "Not Rated"/null/anything else → excluded from an average rather than treated as 0. */
function parseStarRating(rating: string | null): number | null {
  const n = rating != null ? Number(rating) : NaN
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null
}

/** Mean star rating across a make/model/year's tested trims/variants, ignoring untested ones. */
export function averageStarRating(ratings: readonly (string | null)[]): number | null {
  const valid = ratings.map(parseStarRating).filter((n): n is number => n != null)
  if (valid.length === 0) return null
  return valid.reduce((sum, n) => sum + n, 0) / valid.length
}

/** Rounded stars for the glyphs, exact decimal alongside for precision an integer star count would lose. */
export function formatAverageStars(average: number | null): string {
  if (average == null) return '—'
  return `${formatStars(String(Math.round(average)))} (${average.toFixed(1)})`
}
