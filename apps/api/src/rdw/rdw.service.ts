import { Inject, Injectable } from '@nestjs/common'
import { rdwRecallModels, rdwRecalls, rdwRecallTexts, recallTextHash, rdwSpecs } from '@carplates/db'
import type { RdwRecallRow, RdwSpecsRow, RdwTally } from '@carplates/db'
import {
  estimateValue,
  makeKey,
  matchRdwModel,
  isSmallRdwSample,
  matchVdbModelAcrossMakes,
  RDW_RECALLS_LIMIT,
  RDW_MIN_DISPLAY_N,
  pickRdwYear,
  vdbRelatedMakeKeys,
  vdbVehicleClass
} from '@carplates/shared'
import type {
  RdwRecallTranslation,
  RdwRecallsResponse,
  RdwReferenceRow,
  RdwResponse,
  RdwSpecs
} from '@carplates/shared'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

type Range = NonNullable<RdwSpecs['powerKw']>

/** min / median / max triple → a range; null unless the median exists (the other two always come with it). */
const range = (min: number | null, median: number | null, max: number | null): Range | null =>
  median == null ? null : { min: min ?? median, median, max: max ?? median }

/** A partially filled measure (dimensions, top speed): hidden when fewer than `RDW_MIN_DISPLAY_N` vehicles have it. */
const partial = (r: Range | null, n: number | null): Range | null => (r && (n ?? 0) >= RDW_MIN_DISPLAY_N ? r : null)

/** [value, count] pairs → shares of the `n` vehicles that have the attribute; hidden when too few have it. */
const shares = (tally: RdwTally | null, n: number | null): RdwSpecs['fuelMix'] =>
  tally && (n ?? 0) >= RDW_MIN_DISPLAY_N
    ? tally.map(([key, count]) => ({ key, share: Math.min(1, count / (n ?? 1)) }))
    : null

const toSpecs = (r: RdwSpecsRow): RdwSpecs => ({
  year: r.modelYear,
  n: r.n,
  powerKw: range(r.powerKwMin, r.powerKwMedian, r.powerKwMax),
  displacementCc: range(r.displacementCcMin, r.displacementCcMedian, r.displacementCcMax),
  massKg: range(r.massKgMin, r.massKgMedian, r.massKgMax),
  co2GKm: range(r.co2GKmMin, r.co2GKmMedian, r.co2GKmMax),
  grossMassKg: range(r.grossMassKgMin, r.grossMassKgMedian, r.grossMassKgMax),
  wheelbaseCm: range(r.wheelbaseCmMin, r.wheelbaseCmMedian, r.wheelbaseCmMax),
  seats: range(r.seatsMin, r.seatsMedian, r.seatsMax),
  doors: range(r.doorsMin, r.doorsMedian, r.doorsMax),
  towBrakedKg: range(r.towBrakedKgMin, r.towBrakedKgMedian, r.towBrakedKgMax),
  towUnbrakedKg: range(r.towUnbrakedKgMin, r.towUnbrakedKgMedian, r.towUnbrakedKgMax),
  lengthCm: partial(range(r.lengthCmMin, r.lengthCmMedian, r.lengthCmMax), r.lengthCmN),
  widthCm: partial(range(r.widthCmMin, r.widthCmMedian, r.widthCmMax), r.widthCmN),
  heightCm: partial(range(r.heightCmMin, r.heightCmMedian, r.heightCmMax), r.heightCmN),
  topSpeedKmh: partial(range(r.topSpeedKmhMin, r.topSpeedKmhMedian, r.topSpeedKmhMax), r.topSpeedKmhN),
  priceEur: partial(range(r.priceEurMin, r.priceEurMedian, r.priceEurMax), r.priceEurN),
  priceExTaxEur: partial(range(r.priceExTaxEurMin, r.priceExTaxEurMedian, r.priceExTaxEurMax), r.priceEurN),
  bpmEur: partial(range(r.bpmEurMin, r.bpmEurMedian, r.bpmEurMax), r.bpmEurN),
  kerbMassKg: range(r.kerbMassKgMin, r.kerbMassKgMedian, r.kerbMassKgMax),
  cylinders: partial(range(r.cylindersMin, r.cylindersMedian, r.cylindersMax), r.cylindersN),
  consumptionL100: partial(
    range(r.consumptionL100Min, r.consumptionL100Median, r.consumptionL100Max),
    r.consumptionL100N
  ),
  evKwh100: partial(range(r.evKwh100Min, r.evKwh100Median, r.evKwh100Max), r.evKwh100N),
  evRangeKm: partial(range(r.evRangeKmMin, r.evRangeKmMedian, r.evRangeKmMax), r.evRangeKmN),
  noiseDb: partial(range(r.noiseDbMin, r.noiseDbMedian, r.noiseDbMax), r.noiseDbN),
  fuelMix: shares(r.fuelMix, r.fuelMixN),
  colours: shares(r.colours, r.coloursN),
  bodyTypes: shares(r.bodyTypes, r.bodyTypesN),
  energyLabels: shares(r.energyLabels, r.energyLabelsN),
  openRecallShare:
    r.recallOpenN != null && (r.recallN ?? 0) >= RDW_MIN_DISPLAY_N
      ? Math.min(1, r.recallOpenN / (r.recallN ?? 1))
      : null
})

const RECALL_LANGS = ['uk', 'ru', 'en'] as const

@Injectable()
export class RdwService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Persisted aggregates (pnpm ingest:rdw); matching lives in `@carplates/shared` (`matchRdwModel`). */
  async lookup(brand: string, model: string, year: number, registryKind?: string): Promise<RdwResponse> {
    const none: RdwResponse = { brand, model, year, match: null }
    const mk = makeKey(brand)
    if (!mk) return none

    // No kind = a passenger car; a kind RDW can't speak for (trailers, special vehicles) = no match.
    const cls = registryKind ? vdbVehicleClass(registryKind) : 'car'
    if (!cls) return none

    const { db } = this.dbService
    const models: (RdwReferenceRow & { maxN: number })[] = (
      await db
        .select({
          kind: rdwSpecs.kind,
          makeKey: rdwSpecs.makeKey,
          modelKey: rdwSpecs.modelKey,
          make: sql<string>`max(${rdwSpecs.make})`,
          maxN: sql<number>`max(${rdwSpecs.n})`,
          model: sql<string>`max(${rdwSpecs.model})`
        })
        .from(rdwSpecs)
        .where(inArray(rdwSpecs.makeKey, vdbRelatedMakeKeys(mk, model)))
        .groupBy(rdwSpecs.kind, rdwSpecs.makeKey, rdwSpecs.modelKey)
    ).map(r => ({ ...r, maxN: Number(r.maxN), aliases: [] }))

    // A well-sampled spelling wins over a stray thin one (RDW has Mazda "6" with 6 cars beside "MAZDA6" with 4,700); only
    // when nothing well-sampled fits does a thin model still get shown (flagged as a small sample in the UI).
    const found =
      matchRdwModel(
        models.filter(m => !isSmallRdwSample(m.maxN)),
        mk,
        model,
        cls
      ) ?? matchRdwModel(models, mk, model, cls)
    if (!found) return none

    const { row, how } = found
    const years = await db
      .select()
      .from(rdwSpecs)
      .where(and(eq(rdwSpecs.kind, row.kind), eq(rdwSpecs.makeKey, row.makeKey), eq(rdwSpecs.modelKey, row.modelKey)))
    const picked = pickRdwYear(
      years.map(r => ({ year: r.modelYear, n: r.n, row: r })),
      year
    )
    if (!picked) return none

    const specs = toSpecs(picked.row)
    // Unlike the Specs price row (hidden below `RDW_MIN_DISPLAY_N`), a thin price still gives an estimate — flagged `rough`.
    const newPrice = picked.row.priceEurMedian == null ? null : Number(picked.row.priceEurMedian)
    const priceN = picked.row.priceEurN ?? 0
    const base = estimateValue(newPrice, new Date().getFullYear() - year)
    const valueEstimate =
      base && newPrice != null ? { ...base, newPriceEur: newPrice, priceN, rough: isSmallRdwSample(priceN) } : null
    const priceByYear = years
      .filter(r => r.priceEurMedian != null && (r.priceEurN ?? 0) >= RDW_MIN_DISPLAY_N)
      .map(r => ({ year: r.modelYear, priceEur: Math.round(Number(r.priceEurMedian) / 100) * 100 }))
      .sort((a, b) => a.year - b.year)

    const priceByFuel = (picked.row.priceByFuel ?? []).map(([fuel, price, n]) => ({
      fuel,
      priceEur: Math.round(price / 100) * 100,
      n
    }))

    return {
      brand,
      model,
      year,
      match: {
        makeName: picked.row.make,
        modelName: picked.row.model,
        how,
        crossMake: row.makeKey !== mk,
        exactYear: picked.year === year,
        specs,
        priceByYear: priceByYear.length ? priceByYear : null,
        priceByFuel: priceByFuel.length ? priceByFuel : null,
        valueEstimate
      }
    }
  }

  /**
   * Recall campaigns RDW lists for the model (`pnpm ingest:rdw-recalls`), newest first. Campaigns carry no model-year, so
   * the year is not asked; the vehicle class is not either — recall rows have no kind, any registry kind may match.
   */
  async recalls(brand: string, model: string): Promise<RdwRecallsResponse> {
    const none: RdwRecallsResponse = { brand, model, match: null }
    const mk = makeKey(brand)
    if (!mk) return none

    const { db } = this.dbService
    const models = (
      await db
        .select({
          makeKey: rdwRecallModels.makeKey,
          modelKey: rdwRecallModels.modelKey,
          make: sql<string>`max(${rdwRecallModels.make})`,
          model: sql<string>`max(${rdwRecallModels.model})`
        })
        .from(rdwRecallModels)
        .where(inArray(rdwRecallModels.makeKey, vdbRelatedMakeKeys(mk, model)))
        .groupBy(rdwRecallModels.makeKey, rdwRecallModels.modelKey)
    ).map(r => ({ ...r, kind: 'any', aliases: [] }))

    const found = matchVdbModelAcrossMakes(models, mk, model, ['any'])
    if (!found) return none

    const { row, how } = found
    const rows = await db
      .select({ recall: rdwRecalls })
      .from(rdwRecallModels)
      .innerJoin(rdwRecalls, eq(rdwRecalls.referenceCode, rdwRecallModels.referenceCode))
      .where(and(eq(rdwRecallModels.makeKey, row.makeKey), eq(rdwRecallModels.modelKey, row.modelKey)))
      .orderBy(desc(rdwRecalls.publishedAt), desc(rdwRecalls.referenceCode))
    if (rows.length === 0) return none

    const shown = rows.slice(0, RDW_RECALLS_LIMIT).map(({ recall }) => recall)
    const translations = await this.recallTranslations(shown)

    return {
      brand,
      model,
      match: {
        makeName: row.make,
        modelName: row.model,
        how,
        crossMake: row.makeKey !== mk,
        total: rows.length,
        recalls: shown.map(r => ({
          code: r.referenceCode,
          market: 'NL',
          publishedAt: r.publishedAt,
          producer: r.producer,
          defect: r.defect,
          category: r.category,
          consequences: r.consequences,
          remedy: r.remedy,
          moreInfoUrl: r.moreInfoUrl,
          hazards: r.hazards ?? [],
          vehiclesTotal: r.vehiclesTotal,
          vehiclesNational: r.vehiclesNational,
          translations: translations.get(r.referenceCode)
        }))
      }
    }
  }

  /**
   * Machine translations of the campaigns' defect / consequences / remedy: per language, the newest row of the first
   * engine that has every present field (reviewed rows win over machine ones). Languages with a gap are left out.
   */
  private async recallTranslations(
    recalls: RdwRecallRow[]
  ): Promise<Map<string, Record<string, RdwRecallTranslation>>> {
    const out = new Map<string, Record<string, RdwRecallTranslation>>()
    const hashOf = (text: string | null): string | null => (text?.trim() ? recallTextHash(text) : null)
    const hashes = [
      ...new Set(recalls.flatMap(r => [r.defect, r.consequences, r.remedy].map(hashOf)).filter((h): h is string => !!h))
    ]
    if (hashes.length === 0) return out

    const rows = await this.dbService.db.select().from(rdwRecallTexts).where(inArray(rdwRecallTexts.textHash, hashes))
    // hash -> lang -> engine -> text; `reviewed` quality sorts first, then newest engine insertion.
    const byHash = new Map<string, Map<string, { engine: string; text: string; rank: number }>>()
    for (const row of rows) {
      const rank = (row.quality === 'reviewed' ? 2 : 1) * 1e13 + row.translatedAt.getTime()
      const langs = byHash.get(row.textHash) ?? new Map()
      const best = langs.get(row.lang)
      if (!best || rank > best.rank) langs.set(row.lang, { engine: row.engine, text: row.text, rank })
      byHash.set(row.textHash, langs)
    }

    for (const r of recalls) {
      const fields = [r.defect, r.consequences, r.remedy].map(hashOf)
      const result: Record<string, RdwRecallTranslation> = {}
      for (const lang of RECALL_LANGS) {
        const picked = fields.map(h => (h ? (byHash.get(h)?.get(lang) ?? null) : undefined))
        if (picked.some(p => p === null)) continue // a present field lacks this language
        if (picked.every(p => p === undefined)) continue
        const real = picked.filter((p): p is { engine: string; text: string; rank: number } => !!p)
        result[lang] = {
          defect: picked[0]?.text ?? null,
          consequences: picked[1]?.text ?? null,
          remedy: picked[2]?.text ?? null,
          engine: real[0]!.engine
        }
      }
      if (Object.keys(result).length > 0) out.set(r.referenceCode, result)
    }
    return out
  }
}
