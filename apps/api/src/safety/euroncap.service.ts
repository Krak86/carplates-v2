import { Inject, Injectable } from '@nestjs/common'
import { euroncapRatings } from '@carplates/db'
import type { EuroncapRatingRow } from '@carplates/db'
import { makeKey, modelKey } from '@carplates/shared'
import type { EuroNcapRating, EuroNcapRatingsResponse } from '@carplates/shared'
import { and, desc, eq, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

// Mazda's own Euro NCAP model slug is "mazda2"/"mazda3"/"mazda6" — the Ukrainian registry
// (and a bare VIN decode) gives just the digit, mirroring the same quirk in safety.service.ts.
const MAZDA_NUMERIC_MODELS = new Set(['2', '3', '5', '6'])

// BMW's registry model text is a trim/engine code ("320D", "520I", "730D"), while Euro NCAP
// names by chassis series ("3 Series"). The leading digit is BMW's own series identifier.
const BMW_SERIES_RE = /^([1-8])\d{2}/

// Mercedes-Benz's registry model text is likewise a trim code ("E 200", "ML 350"), while
// Euro NCAP names by class. Current classes are a single leading letter (matched generically
// below); legacy nameplates since renamed/consolidated need an explicit alias. Multi-letter
// codes (gl/glk/ml) are matched on the WHOLE leading letter-run, never a shorter prefix of
// it — "gl" must not fire on "GLE 350D" (whose run is "gle"), only on "GL 450" (run "gl"
// exactly) — otherwise GLA/GLB/GLC/GLE/GLS would misresolve to G-Class or GL-Class.
const MERCEDES_LEADING_LETTERS_RE = /^([a-z]+)\d/
const MERCEDES_CLASS_ALIASES: Readonly<Record<string, string>> = {
  a: 'aclass',
  b: 'bclass',
  c: 'cclass',
  e: 'eclass',
  g: 'gclass',
  t: 'tclass',
  x: 'xclass',
  gl: 'gls', // GL-Class -> GLS-Class (2016 rename)
  glk: 'glc', // GLK-Class -> GLC-Class (2015 rename)
  ml: 'gle' // ML-Class -> GLE-Class (2015 rename)
}

/**
 * A second lookup key to retry when the direct make/model match misses — for brands whose
 * registry model text is a trim/engine code rather than the series/class name Euro NCAP
 * indexes by. Exported standalone so this can be unit tested without a DB.
 */
export function brandCandidateKey(mk: string, mdl: string): string | null {
  if (mk === 'mazda' && MAZDA_NUMERIC_MODELS.has(mdl)) return `mazda${mdl}`

  if (mk === 'bmw') {
    const m = BMW_SERIES_RE.exec(mdl)
    return m ? `${m[1]}series` : null
  }

  if (mk === 'mercedesbenz') {
    const letters = MERCEDES_LEADING_LETTERS_RE.exec(mdl)?.[1]
    return letters ? (MERCEDES_CLASS_ALIASES[letters] ?? null) : null
  }

  return null
}

function toRating(row: EuroncapRatingRow): EuroNcapRating {
  return {
    assessmentId: row.assessmentId,
    url: row.url,
    testedVariant: row.testedVariant,
    bodyType: row.bodyType,
    ratingYear: row.ratingYear,
    stars: row.stars,
    adultOccupantPct: row.adultOccupantPct,
    childOccupantPct: row.childOccupantPct,
    vulnerableRoadUsersPct: row.vulnerableRoadUsersPct,
    safetyAssistPct: row.safetyAssistPct,
    safetyPack: row.safetyPack,
    frontImageUrl: row.frontImageUrl,
    images: row.images,
    youtubeIds: row.youtubeIds,
    reportPdfUrl: row.reportPdfUrl
  }
}

/**
 * The generation whose rating best applies to a car of `year` — the newest
 * non-Safety-Pack rating published no later than one year after it (a car can
 * predate its own generation's Euro NCAP publication by a few months). `null`
 * when nothing qualifies (every rating is newer than the car, or Safety-Pack-only).
 * Exported standalone so this selection logic can be unit tested without a DB.
 */
export function selectApplicableAssessmentId(ratings: readonly EuroNcapRating[], year: number): string | null {
  const candidates = ratings.filter(r => !r.safetyPack && r.ratingYear != null && r.ratingYear <= year + 1)
  const newest = candidates.reduce<EuroNcapRating | null>((best, r) => {
    if (!best) return r
    return (r.ratingYear ?? 0) > (best.ratingYear ?? 0) ? r : best
  }, null)
  return newest?.assessmentId ?? null
}

@Injectable()
export class EuroNcapService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async ratings(make: string, model: string, year: number): Promise<EuroNcapRatingsResponse> {
    const mk = makeKey(make)
    const mdl = modelKey(model)
    if (!mk || !mdl) return { make, model, year, ratings: [], applicableAssessmentId: null }

    const rows = await this.matchRows(mk, mdl)
    const ratings = rows.map(toRating).sort((a, b) => (b.ratingYear ?? 0) - (a.ratingYear ?? 0))

    return { make, model, year, ratings, applicableAssessmentId: selectApplicableAssessmentId(ratings, year) }
  }

  /**
   * Prefix-match on `model_key`: the registry's model ("CLA 250", "GOLF VARIANT") is
   * usually more specific than Euro NCAP's own slug ("cla", "golf"), so the stored key
   * must be a prefix of the query key, not an exact match. Only the longest-matching
   * prefix is kept — otherwise a short, unrelated stored key ("i") would tie with the
   * real one ("i30") on every "i30..." query.
   */
  private async matchRows(mk: string, mdl: string): Promise<EuroncapRatingRow[]> {
    const direct = await this.prefixQuery(mk, mdl)
    if (direct.length > 0) return direct

    const candidate = brandCandidateKey(mk, mdl)
    return candidate ? this.prefixQuery(mk, candidate) : []
  }

  private async prefixQuery(mk: string, mdl: string): Promise<EuroncapRatingRow[]> {
    const db = this.dbService.db
    const rows = await db
      .select()
      .from(euroncapRatings)
      .where(
        and(
          eq(euroncapRatings.makeKey, mk),
          sql`${mdl} LIKE ${euroncapRatings.modelKey} || '%'`,
          sql`length(${euroncapRatings.modelKey}) >= 2`
        )
      )
      .orderBy(desc(sql`length(${euroncapRatings.modelKey})`))

    if (rows.length === 0) return rows
    const longest = Math.max(...rows.map(r => r.modelKey.length))
    return rows.filter(r => r.modelKey.length === longest)
  }
}
