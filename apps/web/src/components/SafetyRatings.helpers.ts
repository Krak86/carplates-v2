import type { IihsRating } from '@carplates/shared'

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
export type BodyStyleBucket = 'wagon' | 'pickup' | 'twoDoor' | 'fourDoor' | 'van'

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
  if (normalized.startsWith('КУПЕ') || normalized.startsWith('КАБРІОЛЕТ') || normalized.startsWith('ФАЕТОН'))
    return 'twoDoor'
  if (normalized.startsWith('СЕДАН')) return 'fourDoor'
  return null
}

/**
 * NHTSA's `VehicleDescription` encodes body style as a terse token, not a word — `"SW"` (station
 * wagon), `"PU/CC"`/`"PU/EC"` (pickup, crew/extended cab), `"VAN"`, or a bare door count
 * (`"2 DR"`/`"4 DR"`). Hatchbacks and sedans aren't distinguishable this way (both commonly show
 * "4 DR"), so there's no bucket for hatchback — it's intentionally left to fall through to null on
 * the registry side. `van` has no registry-side counterpart (`registryBodyBucket` treats Ukrainian
 * van/minibus body text as unclassifiable on purpose) — it exists purely so a US-market minivan
 * doesn't slip through as an "unclassifiable, so keep it" match for an unrelated wagon-bodied car
 * that happens to share the same model name (e.g. the JDM Honda Odyssey vs. the US Odyssey minivan).
 */
export function nhtsaBodyBucket(description: string): BodyStyleBucket | null {
  if (/\bSW\b/.test(description)) return 'wagon'
  if (/\bPU\//.test(description)) return 'pickup'
  if (/\bVAN\b/.test(description)) return 'van'
  if (/\b2\s*DR\b/.test(description)) return 'twoDoor'
  if (/\b4\s*DR\b/.test(description)) return 'fourDoor'
  return null
}

/**
 * IIHS's own `variantType` is a plain English phrase ("4-door sedan", "crew cab pickup",
 * "minivan") rather than NHTSA's terse tokens, but resolves to the same coarse door-count-or-
 * shape bucket — an IIHS "4-door SUV" and a Ukrainian "СЕДАН" both land in `fourDoor`, matching
 * the existing coarse door-count semantic `nhtsaBodyBucket` already uses (NHTSA's own "4 DR"
 * likewise conflates sedans with other 4-door body styles). Checked before the door-count rules
 * since a cab-type pickup ("crew cab pickup") carries no leading door count to match on.
 */
export function iihsBodyBucket(variantType: string): BodyStyleBucket | null {
  const v = variantType.toLowerCase()
  if (/\bpickup\b/.test(v)) return 'pickup'
  if (/van\b/.test(v)) return 'van'
  if (/\bwagon\b/.test(v)) return 'wagon'
  if (/^2-door\b/.test(v)) return 'twoDoor'
  if (/^4-door\b/.test(v)) return 'fourDoor'
  return null
}

/**
 * One IIHS "rating" as actually shown in the UI — a run of consecutive model years that share the
 * exact same test results. IIHS republishes an identical assessment under every model-year page a
 * generation spans (a real captured example: a 2025 Honda Civic sedan has 6 distinct test
 * assessments across 1996-2026, but ~30 scraped rows — one per model-year page — because e.g.
 * 2006-2008 and 2020-2021 are byte-identical re-publications, matching IIHS's own "Rating applies
 * to 2023-26 models" phrasing on the live site). Showing one card per scraped row would mean up to
 * 30 near-duplicate "other tested model years" entries for a single real generation — this collapses
 * that back down to one card per genuinely distinct assessment, with a year range instead of a
 * single year.
 */
export type IihsRatingGroup = {
  /** Every scraped row folded into this group, oldest first. */
  assessmentIds: string[]
  /** The newest row in the group — used for the "full report" link, since it's the still-current page. */
  primaryAssessmentId: string
  variantType: string
  vehicleClass: string | null
  award: string | null
  tests: IihsRating['tests']
  imageUrl: string | null
  yearFrom: number
  yearTo: number
  /** True if any row folded into this group is in the caller's applicable-assessment set. */
  applicable: boolean
}

/**
 * Groups same-variant ratings into runs of consecutive model years sharing an identical award +
 * test signature. A gap (a later year with different content, or a missing model year) always
 * starts a new group — this only merges truly consecutive, truly identical publications, never
 * bridges across a real change or a re-tested-later coincidence.
 */
export function groupIihsRatings(ratings: readonly IihsRating[], applicableIds: readonly string[]): IihsRatingGroup[] {
  const sorted = [...ratings].sort((a, b) => a.variantType.localeCompare(b.variantType) || a.modelYear - b.modelYear)

  const groups: IihsRatingGroup[] = []
  for (const r of sorted) {
    const last = groups.at(-1)
    const isApplicable = applicableIds.includes(r.assessmentId)
    const continuesLast =
      last != null &&
      last.variantType === r.variantType &&
      last.award === r.award &&
      last.yearTo + 1 === r.modelYear &&
      JSON.stringify(last.tests) === JSON.stringify(r.tests)

    if (continuesLast && last) {
      last.assessmentIds.push(r.assessmentId)
      last.primaryAssessmentId = r.assessmentId
      last.imageUrl = r.imageUrl ?? last.imageUrl
      last.yearTo = r.modelYear
      last.applicable = last.applicable || isApplicable
    } else {
      groups.push({
        assessmentIds: [r.assessmentId],
        primaryAssessmentId: r.assessmentId,
        variantType: r.variantType,
        vehicleClass: r.vehicleClass,
        award: r.award,
        tests: r.tests,
        imageUrl: r.imageUrl,
        yearFrom: r.modelYear,
        yearTo: r.modelYear,
        applicable: isApplicable
      })
    }
  }
  return groups
}

/**
 * Drops ratings whose body style confidently disagrees with the registry car's — but only when
 * *both* sides classify to a known bucket; an unclassifiable value on either side is kept rather
 * than filtered, so a gap in the bucket lists can never hide a real rating. If every rating gets
 * filtered out (a wrong classification, or NHTSA's description format not matching what's expected
 * here), falls back to the full unfiltered list — filtering can only narrow results, never produce
 * "no rating" for a car that genuinely has one.
 *
 * One deliberate exception: `van` never gets the unfiltered-fallback safety net. The other buckets
 * can disagree purely from a labeling-scheme quirk (a crew-cab pickup showing as a bare "4 DR" in
 * one row and "PU/CC" in another), so a mismatch there might still be the same real car — worth
 * protecting against hiding it. A `van` token has no such ambiguity: NHTSA never mislabels a wagon,
 * sedan, coupe, or pickup as "VAN". So when every rating NHTSA returned is a van and the registry
 * car isn't, that's confident evidence of a same-model-name-different-vehicle collision across
 * markets (the JDM Honda Odyssey — a wagon-shaped MPV, never exported — vs. the unrelated US
 * Odyssey minivan NHTSA actually tested) rather than a labeling quirk, and resurrecting it via the
 * fallback would show crash-test data for a car the plate doesn't have.
 */
export function filterByBodyStyle<T>(
  ratings: readonly T[],
  registryBody: string | null,
  classify: (rating: T) => BodyStyleBucket | null
): T[] {
  const wanted = registryBodyBucket(registryBody)
  if (!wanted) return [...ratings]

  const filtered = ratings.filter(r => {
    const actual = classify(r)
    return actual == null || actual === wanted
  })
  if (filtered.length > 0) return filtered

  const allVan = ratings.length > 0 && ratings.every(r => classify(r) === 'van')
  if (wanted !== 'van' && allVan) return []

  return [...ratings]
}
