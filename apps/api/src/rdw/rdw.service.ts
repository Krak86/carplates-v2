import { Inject, Injectable } from '@nestjs/common'
import { rdwSpecs } from '@carplates/db'
import type { RdwSpecsRow, RdwTally } from '@carplates/db'
import {
  makeKey,
  matchRdwModel,
  isSmallRdwSample,
  RDW_MIN_DISPLAY_N,
  pickRdwYear,
  vdbRelatedMakeKeys,
  vdbVehicleClass
} from '@carplates/shared'
import type { RdwReferenceRow, RdwResponse, RdwSpecs } from '@carplates/shared'
import { and, eq, inArray, sql } from 'drizzle-orm'

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
        specs: toSpecs(picked.row)
      }
    }
  }
}
