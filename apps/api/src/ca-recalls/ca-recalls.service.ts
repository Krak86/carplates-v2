import { Inject, Injectable } from '@nestjs/common'
import { caRecallModels, caRecalls, rdwRecallTexts, recallTextHash } from '@carplates/db'
import {
  CA_RECALLS_LIMIT,
  joinCaText,
  makeKey,
  matchVdbModelAcrossMakes,
  splitCaText,
  vdbRelatedMakeKeys
} from '@carplates/shared'
import type { CaRecallsResponse, CaTextSection } from '@carplates/shared'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

/** Languages Transport Canada's English text is translated into. */
const CA_LANGS = ['uk', 'ru'] as const

@Injectable()
export class CaRecallsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /**
   * Canadian recall campaigns without a US twin for the model (`pnpm ingest:ca-recalls`), newest first. With a `year`, a
   * campaign shows only when it covers that model year (or records no year at all).
   */
  async recalls(brand: string, model: string, year?: number): Promise<CaRecallsResponse> {
    const none: CaRecallsResponse = { brand, model, year: year ?? null, match: null }
    const mk = makeKey(brand)
    if (!mk) return none

    const { db } = this.dbService
    const models = (
      await db
        .select({
          makeKey: caRecallModels.makeKey,
          modelKey: caRecallModels.modelKey,
          make: sql<string>`max(${caRecallModels.make})`,
          model: sql<string>`max(${caRecallModels.model})`
        })
        .from(caRecallModels)
        .where(inArray(caRecallModels.makeKey, vdbRelatedMakeKeys(mk, model)))
        .groupBy(caRecallModels.makeKey, caRecallModels.modelKey)
    ).map(r => ({ ...r, kind: 'any', aliases: [] }))

    const found = matchVdbModelAcrossMakes(models, mk, model, ['any'])
    if (!found) return none

    const { row, how } = found
    const links = await db
      .select({ recall: caRecalls, modelYear: caRecallModels.modelYear })
      .from(caRecallModels)
      .innerJoin(caRecalls, eq(caRecalls.recallNumber, caRecallModels.recallNumber))
      .where(and(eq(caRecallModels.makeKey, row.makeKey), eq(caRecallModels.modelKey, row.modelKey)))
      .orderBy(desc(caRecalls.recalledAt), desc(caRecalls.recallNumber))

    // One entry per campaign with the model years it covers; a year filter keeps campaigns covering it (or recording none).
    const byCode = new Map<string, { recall: (typeof links)[number]['recall']; years: Set<number> }>()
    for (const { recall, modelYear } of links) {
      const e = byCode.get(recall.recallNumber) ?? { recall, years: new Set<number>() }
      if (modelYear > 0) e.years.add(modelYear)
      byCode.set(recall.recallNumber, e)
    }
    const rows = [...byCode.values()].filter(e => !year || e.years.size === 0 || e.years.has(year))
    if (rows.length === 0) return none

    const shown = rows.slice(0, CA_RECALLS_LIMIT)
    const translations = await this.translations(shown.map(e => e.recall.comment))

    return {
      brand,
      model,
      year: year ?? null,
      match: {
        makeName: row.make,
        modelName: row.model,
        how,
        crossMake: row.makeKey !== mk,
        total: rows.length,
        recalls: shown.map(({ recall, years }) => ({
          code: recall.recallNumber,
          publishedAt: recall.recalledAt,
          notification: recall.notification,
          category: recall.category,
          system: recall.system,
          manufacturerNo: recall.mfrRecallNo,
          text: recall.comment,
          units: recall.units,
          years: [...years].sort((a, b) => a - b),
          translations: recall.comment ? translations.get(recall.comment) : undefined
        }))
      }
    }
  }

  /**
   * Machine translations (`pnpm ingest:ca-recalls:translate`) of each text, section by section: per language the best row
   * (reviewed first, then newest) of every section, reassembled with localized headings. A language with a missing
   * section is left out, so the UI keeps showing the English original.
   */
  private async translations(
    comments: (string | null)[]
  ): Promise<Map<string, Record<string, { text: string; engine: string }>>> {
    const out = new Map<string, Record<string, { text: string; engine: string }>>()
    const parsed = new Map<string, CaTextSection[]>()
    for (const c of comments) if (c) parsed.set(c, splitCaText(c))
    const hashes = [...new Set([...parsed.values()].flatMap(s => s.map(x => recallTextHash(x.body))))]
    if (hashes.length === 0) return out

    const rows = await this.dbService.db.select().from(rdwRecallTexts).where(inArray(rdwRecallTexts.textHash, hashes))
    const best = new Map<string, { engine: string; text: string; rank: number }>() // `${hash}|${lang}` -> row
    for (const row of rows) {
      const rank = (row.quality === 'reviewed' ? 2 : 1) * 1e13 + row.translatedAt.getTime()
      const key = `${row.textHash}|${row.lang}`
      const cur = best.get(key)
      if (!cur || rank > cur.rank) best.set(key, { engine: row.engine, text: row.text, rank })
    }

    for (const [comment, sections] of parsed) {
      const result: Record<string, { text: string; engine: string }> = {}
      for (const lang of CA_LANGS) {
        const picked = sections.map(s => best.get(`${recallTextHash(s.body)}|${lang}`))
        if (picked.length === 0 || picked.some(p => !p)) continue
        result[lang] = {
          text: joinCaText(
            sections.map((s, i) => ({ label: s.label, body: picked[i]!.text })),
            lang
          ),
          engine: picked[0]!.engine
        }
      }
      if (Object.keys(result).length > 0) out.set(comment, result)
    }
    return out
  }
}
