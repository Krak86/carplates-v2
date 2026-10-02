import { Inject, Injectable } from '@nestjs/common'
import { euroncapRatings } from '@carplates/db'
import type { EuroncapRatingRow } from '@carplates/db'
import { brandCandidateKey, makeKey, modelKey } from '@carplates/shared'
import type { EuroNcapRating, EuroNcapRatingsResponse } from '@carplates/shared'
import { and, desc, eq, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

// Lives in @carplates/shared (the stats script needs it too); re-exported so existing imports keep working.
export { brandCandidateKey }

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
