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

/**
 * NHTSA queries by make/model/year only — no body style — so a single query can return every
 * body configuration NHTSA tested under that name (sedan, wagon, coupe...), not just the one the
 * source car actually is. A coarse bucket comparable between the registry's free-text `body` and
 * NHTSA's terse `VehicleDescription` tokens, so mismatched body styles can be filtered out.
 */
export type BodyStyleBucket = 'wagon' | 'pickup' | 'twoDoor' | 'fourDoor'

/**
 * The registry's `body` is Ukrainian free text with a trailing "-B"/"-В"/" В" noise suffix
 * (`"УНІВЕРСАЛ-B"`, `"СЕДАН В"`) — stripped before matching. Returns null for anything that
 * doesn't map to a bucket confidently (vans, "ПАСАЖИРСЬКИЙ", limousines...) — callers must treat
 * null as "unknown", never as "no match".
 */
export function registryBodyBucket(body: string | null): BodyStyleBucket | null {
  if (!body) return null
  const normalized = body.toUpperCase().replace(/[\s-]+/g, '')
  if (normalized.startsWith('УНІВЕРСАЛ') || normalized.startsWith('КОМБІ')) return 'wagon'
  if (normalized.startsWith('ПІКАП')) return 'pickup'
  if (normalized.startsWith('КУПЕ') || normalized.startsWith('КАБРІОЛЕТ') || normalized.startsWith('ФАЕТОН')) return 'twoDoor'
  if (normalized.startsWith('СЕДАН')) return 'fourDoor'
  return null
}

/**
 * NHTSA's `VehicleDescription` encodes body style as a terse token, not a word — `"SW"` (station
 * wagon), `"PU/CC"`/`"PU/EC"` (pickup, crew/extended cab), or a bare door count (`"2 DR"`/`"4 DR"`).
 * Hatchbacks and sedans aren't distinguishable this way (both commonly show "4 DR"), so there's no
 * bucket for hatchback — it's intentionally left to fall through to null on the registry side.
 */
export function nhtsaBodyBucket(description: string): BodyStyleBucket | null {
  if (/\bSW\b/.test(description)) return 'wagon'
  if (/\bPU\//.test(description)) return 'pickup'
  if (/\b2\s*DR\b/.test(description)) return 'twoDoor'
  if (/\b4\s*DR\b/.test(description)) return 'fourDoor'
  return null
}

/**
 * Drops ratings whose body style confidently disagrees with the registry car's — but only when
 * *both* sides classify to a known bucket; an unclassifiable value on either side is kept rather
 * than filtered, so a gap in the bucket lists can never hide a real rating. If every rating gets
 * filtered out (a wrong classification, or NHTSA's description format not matching what's expected
 * here), falls back to the full unfiltered list — filtering can only narrow results, never produce
 * "no rating" for a car that genuinely has one.
 */
export function filterByBodyStyle<T extends { description: string }>(
  ratings: readonly T[],
  registryBody: string | null
): T[] {
  const wanted = registryBodyBucket(registryBody)
  if (!wanted) return [...ratings]

  const filtered = ratings.filter(r => {
    const actual = nhtsaBodyBucket(r.description)
    return actual == null || actual === wanted
  })
  return filtered.length > 0 ? filtered : [...ratings]
}
