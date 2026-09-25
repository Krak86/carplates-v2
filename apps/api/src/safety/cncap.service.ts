import { Inject, Injectable } from '@nestjs/common'
import { cncapRatings } from '@carplates/db'
import type { CncapRatingRow } from '@carplates/db'
import { makeKey, modelKey } from '@carplates/shared'
import type { CncapRating, CncapRatingsResponse, CncapVehicleClass } from '@carplates/shared'
import { and, desc, eq, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

function toRating(row: CncapRatingRow): CncapRating {
  return {
    assessmentId: row.assessmentId,
    nameZh: row.nameZh,
    manufacturerZh: row.manufacturerZh,
    vehicleClass: row.vehicleClass as CncapVehicleClass | null,
    ratingYear: row.ratingYear,
    scoreUnit: row.scoreUnit,
    overallScore: row.overallScore,
    occupantScore: row.occupantScore,
    vruScore: row.vruScore,
    activeSafetyScore: row.activeSafetyScore
  }
}

/**
 * The generation whose rating best applies to a car of `year` — the newest rating published
 * no later than one year after it, mirroring `selectApplicableAssessmentId` in
 * euroncap.service.ts/jncap.service.ts. `null` when nothing qualifies. Exported standalone so
 * this can be unit tested without a DB.
 */
export function selectApplicableAssessmentId(ratings: readonly CncapRating[], year: number): string | null {
  const candidates = ratings.filter(r => r.ratingYear != null && r.ratingYear <= year + 1)
  const newest = candidates.reduce<CncapRating | null>((best, r) => {
    if (!best) return r
    return (r.ratingYear ?? 0) > (best.ratingYear ?? 0) ? r : best
  }, null)
  return newest?.assessmentId ?? null
}

@Injectable()
export class CncapService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async ratings(make: string, model: string, year: number): Promise<CncapRatingsResponse> {
    const mk = makeKey(make)
    const mdl = modelKey(model)
    if (!mk || !mdl) return { make, model, year, ratings: [], applicableAssessmentId: null }

    const rows = await this.prefixQuery(mk, mdl)
    const ratings = rows.map(toRating).sort((a, b) => (b.ratingYear ?? 0) - (a.ratingYear ?? 0))

    return { make, model, year, ratings, applicableAssessmentId: selectApplicableAssessmentId(ratings, year) }
  }

  /**
   * Prefix-match on `model_key`, same reasoning as `EuroNcapService`/`JncapService`'s
   * `prefixQuery`: the registry's model text is usually more specific than the curated
   * translation table's model name, so the stored key must be a prefix of the query key.
   * Only the longest-matching prefix is kept.
   */
  private async prefixQuery(mk: string, mdl: string): Promise<CncapRatingRow[]> {
    const db = this.dbService.db
    const rows = await db
      .select()
      .from(cncapRatings)
      .where(
        and(
          eq(cncapRatings.makeKey, mk),
          sql`${mdl} LIKE ${cncapRatings.modelKey} || '%'`,
          sql`length(${cncapRatings.modelKey}) >= 2`
        )
      )
      .orderBy(desc(sql`length(${cncapRatings.modelKey})`))

    if (rows.length === 0) return rows
    const longest = Math.max(...rows.map(r => r.modelKey.length))
    return rows.filter(r => r.modelKey.length === longest)
  }
}
