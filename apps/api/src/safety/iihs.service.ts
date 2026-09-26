import { Inject, Injectable } from '@nestjs/common'
import { iihsRatings } from '@carplates/db'
import type { IihsRatingRow } from '@carplates/db'
import { makeKey, modelKey } from '@carplates/shared'
import type { IihsRating, IihsRatingsResponse } from '@carplates/shared'
import { and, desc, eq, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'
import { brandCandidateKey } from './euroncap.service.js'

function toRating(row: IihsRatingRow): IihsRating {
  return {
    assessmentId: row.assessmentId,
    variantType: row.variantType,
    vehicleClass: row.vehicleClass,
    modelYear: row.modelYear,
    award: row.award,
    tests: row.tests,
    imageUrl: row.imageUrl
  }
}

/**
 * The assessments applicable to a car of `year` — every variant rated for that exact model year,
 * or (if none) every variant rated for `year + 1` (the registry stores the build year, and US
 * model years commonly run about a year ahead — same one-year slack the other four sources use
 * via `selectApplicableAssessmentId`). Plural, unlike the other sources: IIHS rates each body
 * variant of a model-year separately (a sedan and a hatchback both count as "applicable" for the
 * same year), so a single id can't represent it — the caller (IihsRatings.tsx) narrows further
 * by body style. Exported standalone so this can be unit tested without a DB.
 */
export function selectApplicableAssessmentIds(ratings: readonly IihsRating[], year: number): string[] {
  const exact = ratings.filter(r => r.modelYear === year)
  if (exact.length > 0) return exact.map(r => r.assessmentId)
  return ratings.filter(r => r.modelYear === year + 1).map(r => r.assessmentId)
}

@Injectable()
export class IihsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async ratings(make: string, model: string, year: number): Promise<IihsRatingsResponse> {
    const mk = makeKey(make)
    const mdl = modelKey(model)
    if (!mk || !mdl) return { make, model, year, ratings: [], applicableAssessmentIds: [] }

    const rows = await this.matchRows(mk, mdl)
    const ratings = rows.map(toRating).sort((a, b) => b.modelYear - a.modelYear)

    return { make, model, year, ratings, applicableAssessmentIds: selectApplicableAssessmentIds(ratings, year) }
  }

  /**
   * Prefix-match on `model_key`, same reasoning as `EuroNcapService`/`JncapService`/
   * `CncapService`/`KncapService`'s `prefixQuery`. On a miss, retries via `brandCandidateKey()` —
   * imported from `euroncap.service.ts` rather than re-implemented here, unlike the other three
   * sources' self-contained duplication: IIHS names BMW's series ("3 Series") and Mercedes-Benz's
   * classes ("C-Class", "E-Class", with the same legacy ML/GLK/GL renames) with the exact same
   * convention Euro NCAP does, so a second copy of the alias tables would just be the same facts
   * typed twice, not independent domain logic.
   */
  private async matchRows(mk: string, mdl: string): Promise<IihsRatingRow[]> {
    const direct = await this.prefixQuery(mk, mdl)
    if (direct.length > 0) return direct

    const candidate = brandCandidateKey(mk, mdl)
    return candidate ? this.prefixQuery(mk, candidate) : []
  }

  private async prefixQuery(mk: string, mdl: string): Promise<IihsRatingRow[]> {
    const db = this.dbService.db
    const rows = await db
      .select()
      .from(iihsRatings)
      .where(
        and(
          eq(iihsRatings.makeKey, mk),
          sql`${mdl} LIKE ${iihsRatings.modelKey} || '%'`,
          sql`length(${iihsRatings.modelKey}) >= 2`
        )
      )
      .orderBy(desc(sql`length(${iihsRatings.modelKey})`))

    if (rows.length === 0) return rows
    const longest = Math.max(...rows.map(r => r.modelKey.length))
    return rows.filter(r => r.modelKey.length === longest)
  }
}
