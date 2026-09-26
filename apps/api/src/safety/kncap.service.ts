import { Inject, Injectable } from '@nestjs/common'
import { kncapRatings } from '@carplates/db'
import type { KncapRatingRow } from '@carplates/db'
import { makeKey, modelKey } from '@carplates/shared'
import type { KncapRating, KncapRatingsResponse } from '@carplates/shared'
import { and, desc, eq, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

function toRating(row: KncapRatingRow): KncapRating {
  return {
    assessmentId: row.assessmentId,
    nameKo: row.nameKo,
    ratingYear: row.ratingYear,
    overallScore: row.overallScore,
    overallClass: row.overallClass,
    crashPct: row.crashPct,
    crashStar: row.crashStar,
    pedestrianPct: row.pedestrianPct,
    pedestrianStar: row.pedestrianStar,
    accidentPct: row.accidentPct,
    accidentStar: row.accidentStar,
    imageUrl: row.imageUrl
  }
}

/**
 * The generation whose rating best applies to a car of `year` — the newest rating published
 * no later than one year after it, mirroring `selectApplicableAssessmentId` in
 * euroncap.service.ts/jncap.service.ts/cncap.service.ts. `null` when nothing qualifies.
 * Exported standalone so this can be unit tested without a DB.
 */
export function selectApplicableAssessmentId(ratings: readonly KncapRating[], year: number): string | null {
  const candidates = ratings.filter(r => r.ratingYear != null && r.ratingYear <= year + 1)
  const newest = candidates.reduce<KncapRating | null>((best, r) => {
    if (!best) return r
    return (r.ratingYear ?? 0) > (best.ratingYear ?? 0) ? r : best
  }, null)
  return newest?.assessmentId ?? null
}

@Injectable()
export class KncapService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async ratings(make: string, model: string, year: number): Promise<KncapRatingsResponse> {
    const mk = makeKey(make)
    const mdl = modelKey(model)
    if (!mk || !mdl) return { make, model, year, ratings: [], applicableAssessmentId: null }

    const rows = await this.prefixQuery(mk, mdl)
    const ratings = rows.map(toRating).sort((a, b) => (b.ratingYear ?? 0) - (a.ratingYear ?? 0))

    return { make, model, year, ratings, applicableAssessmentId: selectApplicableAssessmentId(ratings, year) }
  }

  /**
   * Prefix-match on `model_key`, same reasoning as `EuroNcapService`/`JncapService`/
   * `CncapService`'s `prefixQuery`: the registry's model text is usually more specific than
   * the curated translation table's model name, so the stored key must be a prefix of the
   * query key. Only the longest-matching prefix is kept.
   */
  private async prefixQuery(mk: string, mdl: string): Promise<KncapRatingRow[]> {
    const db = this.dbService.db
    const rows = await db
      .select()
      .from(kncapRatings)
      .where(
        and(
          eq(kncapRatings.makeKey, mk),
          sql`${mdl} LIKE ${kncapRatings.modelKey} || '%'`,
          sql`length(${kncapRatings.modelKey}) >= 2`
        )
      )
      .orderBy(desc(sql`length(${kncapRatings.modelKey})`))

    if (rows.length === 0) return rows
    const longest = Math.max(...rows.map(r => r.modelKey.length))
    return rows.filter(r => r.modelKey.length === longest)
  }
}
