import { Inject, Injectable } from '@nestjs/common'
import { jncapRatings } from '@carplates/db'
import type { JncapRatingRow } from '@carplates/db'
import { makeKey, modelKey } from '@carplates/shared'
import type { JncapRating, JncapRatingsResponse } from '@carplates/shared'
import { and, desc, eq, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

function toRating(row: JncapRatingRow): JncapRating {
  return {
    assessmentId: row.assessmentId,
    url: row.url,
    vehicleType: row.vehicleType,
    ratingYear: row.ratingYear,
    stars: row.stars,
    overallPct: row.overallPct,
    preventiveRank: row.preventiveRank,
    preventivePct: row.preventivePct,
    collisionRank: row.collisionRank,
    collisionPct: row.collisionPct,
    emergencyCallType: row.emergencyCallType,
    emergencyCallPct: row.emergencyCallPct,
    testScores: row.testScores,
    imageUrl: row.imageUrl,
    youtubeId: row.youtubeId,
    reportPdfUrl: row.reportPdfUrl
  }
}

/**
 * The generation whose rating best applies to a car of `year` — the newest rating published
 * no later than one year after it (a car can predate its own generation's JNCAP publication
 * by a few months), mirroring `selectApplicableAssessmentId` in euroncap.service.ts. `null`
 * when nothing qualifies. Exported standalone so this can be unit tested without a DB.
 */
export function selectApplicableAssessmentId(ratings: readonly JncapRating[], year: number): string | null {
  const candidates = ratings.filter(r => r.ratingYear != null && r.ratingYear <= year + 1)
  const newest = candidates.reduce<JncapRating | null>((best, r) => {
    if (!best) return r
    return (r.ratingYear ?? 0) > (best.ratingYear ?? 0) ? r : best
  }, null)
  return newest?.assessmentId ?? null
}

@Injectable()
export class JncapService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async ratings(make: string, model: string, year: number): Promise<JncapRatingsResponse> {
    const mk = makeKey(make)
    const mdl = modelKey(model)
    if (!mk || !mdl) return { make, model, year, ratings: [], applicableAssessmentId: null }

    const rows = await this.prefixQuery(mk, mdl)
    const ratings = rows.map(toRating).sort((a, b) => (b.ratingYear ?? 0) - (a.ratingYear ?? 0))

    return { make, model, year, ratings, applicableAssessmentId: selectApplicableAssessmentId(ratings, year) }
  }

  /**
   * Prefix-match on `model_key`, same reasoning as `EuroNcapService.prefixQuery`: the
   * registry's model text is usually more specific than JNCAP's own naming, so the stored
   * key must be a prefix of the query key. Only the longest-matching prefix is kept.
   */
  private async prefixQuery(mk: string, mdl: string): Promise<JncapRatingRow[]> {
    const db = this.dbService.db
    const rows = await db
      .select()
      .from(jncapRatings)
      .where(
        and(
          eq(jncapRatings.makeKey, mk),
          sql`${mdl} LIKE ${jncapRatings.modelKey} || '%'`,
          sql`length(${jncapRatings.modelKey}) >= 2`
        )
      )
      .orderBy(desc(sql`length(${jncapRatings.modelKey})`))

    if (rows.length === 0) return rows
    const longest = Math.max(...rows.map(r => r.modelKey.length))
    return rows.filter(r => r.modelKey.length === longest)
  }
}
