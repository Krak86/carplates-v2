import { Inject, Injectable } from '@nestjs/common'
import { modelSpecWiki } from '@carplates/db'
import type { ModelSpecWikiRow } from '@carplates/db'
import { CURATED_LANG, pickGeneration } from '@carplates/shared'
import type { WikiSource, WikiSpecsResponse } from '@carplates/shared'
import { and, eq } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'
import { GenerationsService } from '../generations/generations.service.js'

/** A block's source, or null when the ingest stored no edition for it. A curated block carries the row's one citation. */
function source(
  lang: string,
  title: string,
  cite: Pick<ModelSpecWikiRow, 'sourceLabel' | 'sourceUrl' | 'sourceAccessed'>
): WikiSource | null {
  if (lang === CURATED_LANG) {
    return cite.sourceUrl
      ? { lang, title: cite.sourceLabel, url: cite.sourceUrl, accessed: cite.sourceAccessed || null }
      : null
  }
  return lang && title ? { lang, title } : null
}

@Injectable()
export class WikispecsService {
  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(GenerationsService) private readonly generationsService: GenerationsService
  ) {}

  /**
   * Wikipedia catalogue figures (`pnpm ingest:wikispecs`) of the generation containing `year`. The model and generation
   * are found exactly like the generation chip's; a miss, or a generation with no stored figure, answers `match: null`.
   */
  async wikispecs(brand: string, model: string, year: number): Promise<WikiSpecsResponse> {
    const none: WikiSpecsResponse = { brand, model, year, match: null }
    const located = await this.generationsService.locate(brand, model)
    if (!located) return none

    const generation = pickGeneration(located.list, year)
    if (!generation) return none

    const [r] = await this.dbService.db
      .select()
      .from(modelSpecWiki)
      .where(
        and(
          eq(modelSpecWiki.makeKey, located.row.makeKey),
          eq(modelSpecWiki.modelKey, located.row.modelKey),
          eq(modelSpecWiki.yearFrom, generation.yearFrom)
        )
      )
      .limit(1)
    if (!r) return none

    const dimensions = {
      wheelbaseMm: r.wheelbaseMm,
      lengthMm: r.lengthMm,
      widthMm: r.widthMm,
      heightMm: r.heightMm,
      kerbKg: r.kerbKg,
      fuelTankL: r.fuelTankL
    }
    const hasDimensions = Object.values(dimensions).some(v => v != null)
    if (!hasDimensions && r.engines.length === 0 && !r.layout && !r.transmission) return none

    return {
      brand,
      model,
      year,
      match: {
        makeName: located.row.make,
        modelName: located.row.model,
        how: located.how,
        crossMake: located.crossMake,
        generationLabel: generation.label,
        generationCode: generation.code,
        yearFrom: generation.yearFrom,
        yearTo: generation.yearTo,
        dimensions: hasDimensions ? dimensions : null,
        dimensionsSource: hasDimensions ? source(r.srcLang, r.srcTitle, r) : null,
        engines: r.engines,
        enginesSource: source(r.enginesLang, r.enginesTitle, r),
        layout: r.layout,
        transmission: r.transmission,
        driveSource: source(r.driveLang, r.driveTitle, r)
      }
    }
  }
}
