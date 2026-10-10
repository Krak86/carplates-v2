import { Inject, Injectable } from '@nestjs/common'
import { motBaseline, motIssues, motKeys, motMeta, motReasons, motStats } from '@carplates/db'
import type { MotCounts } from '@carplates/db'
import {
  MARKET_MAKE_SYNONYMS,
  MOT_BAND_EDGES_KM,
  MOT_GROUP_CODES,
  MOT_MIN_BAND_TESTS,
  makeKey,
  matchVdbModelAcrossMakes,
  vdbRelatedMakeKeys,
  vdbVehicleClass
} from '@carplates/shared'
import type { MotGroupCode, MotIssue, MotKind, MotReason, MotResponse, VdbVehicleClass } from '@carplates/shared'
import { and, eq, inArray } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

/** MOT kinds a registry vehicle class may match, most preferred first (the registry files vans as cars or as trucks). */
const KINDS_BY_CLASS: Readonly<Partial<Record<VdbVehicleClass, readonly MotKind[]>>> = {
  car: ['car', 'van'],
  truck: ['van', 'car'],
  motorcycle: ['motorcycle']
}

/** The UK sells Opel cars as Vauxhall; the MOT files know them only by that name. */
const MOT_MAKE_ALIASES: Readonly<Record<string, string>> = { opel: makeKey(MARKET_MAKE_SYNONYMS.opel!)! }

/** Model years around the car's: first ± 2, then ± 5, then every year, until the window holds `MIN_WINDOW_TESTS` tests. */
const WINDOW_RADII = [2, 5] as const
const MIN_WINDOW_TESTS = 1000

/** Most specific reasons returned. */
const REASONS_LIMIT = 10

type Pair = MotCounts[string]
type IssueRow = typeof motIssues.$inferSelect

const share = (n: number, of: number): number | null => (of >= MOT_MIN_BAND_TESTS ? Math.min(1, n / of) : null)
const failOf = (c: Pair): number => c[0]
const watchOf = (c: Pair): number => c[1]

@Injectable()
export class MotService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /**
   * UK MOT statistics for the model (`pnpm ingest:mot`): model-level, never about this car. Matching is the shared
   * VehiclesDB matcher over the stored make/models; a miss gives `match: null` and the section hides.
   */
  async lookup(brand: string, model: string, year: number | null, registryKind?: string): Promise<MotResponse> {
    const none: MotResponse = { brand, model, year: year ?? 0, match: null }
    const mk = makeKey(brand)
    if (!mk) return none
    const cls = registryKind ? vdbVehicleClass(registryKind) : 'car'
    const kinds = cls ? KINDS_BY_CLASS[cls] : undefined
    if (!kinds) return none

    const { db } = this.dbService
    const alias = MOT_MAKE_ALIASES[mk]
    const makeKeys = [...vdbRelatedMakeKeys(mk, model), ...(alias ? [alias] : [])]
    const models = (
      await db
        .select({
          kind: motKeys.kind,
          makeKey: motKeys.makeKey,
          modelKey: motKeys.modelKey,
          make: motKeys.make,
          model: motKeys.model,
          tests: motKeys.tests
        })
        .from(motKeys)
        .where(inArray(motKeys.makeKey, makeKeys))
    ).map(r => ({ ...r, aliases: [] as string[] }))

    // A few Opel-badged cars do get MOT-tested in the UK, but the sample under the UK name is far bigger: take the larger.
    const candidates = [
      matchVdbModelAcrossMakes(models, mk, model, kinds),
      alias ? matchVdbModelAcrossMakes(models, alias, model, kinds) : null
    ].filter((m): m is NonNullable<typeof m> => m !== null)
    const found = candidates.sort((a, b) => b.row.tests - a.row.tests)[0]
    if (!found) return none

    const { row, how } = found
    const kind = row.kind as MotKind
    const [stats, issues, baseline, meta] = await Promise.all([
      db
        .select()
        .from(motStats)
        .where(and(eq(motStats.kind, kind), eq(motStats.makeKey, row.makeKey), eq(motStats.modelKey, row.modelKey))),
      db
        .select()
        .from(motIssues)
        .where(and(eq(motIssues.kind, kind), eq(motIssues.makeKey, row.makeKey), eq(motIssues.modelKey, row.modelKey))),
      db.select().from(motBaseline).where(eq(motBaseline.kind, kind)),
      db.select().from(motMeta).limit(1)
    ])
    const years = meta[0]
    if (!years || stats.length === 0) return none

    const bandCount = MOT_BAND_EDGES_KM[kind].length
    const modelYears = stats.map(s => s.modelYear)
    const all: [number, number] = [Math.min(...modelYears), Math.max(...modelYears)]
    const testsIn = (w: [number, number]): number =>
      stats.filter(s => s.modelYear >= w[0] && s.modelYear <= w[1]).reduce((a, s) => a + s.tests, 0)

    // The car's own model years if the sample is big enough, else a wider window, else every year.
    let win = all
    let widened = false
    if (year) {
      widened = true
      for (const radius of WINDOW_RADII) {
        const w: [number, number] = [year - radius, year + radius]
        if (testsIn(w) >= MIN_WINDOW_TESTS) {
          win = w
          widened = radius !== WINDOW_RADII[0]
          break
        }
      }
    }

    const byBand = Array.from({ length: bandCount }, () => ({ tests: 0, fails: 0, advisories: 0 }))
    for (const s of stats) {
      if (s.modelYear < win[0] || s.modelYear > win[1] || s.band >= bandCount) continue
      const b = byBand[s.band]!
      b.tests += s.tests
      b.fails += s.fails
      b.advisories += s.advisories
    }
    const issueAt = (band: number): IssueRow | undefined => issues.find(i => i.band === band)
    const baseAt = (band: number): (typeof baseline)[number] | undefined => baseline.find(i => i.band === band)
    const bandsOf = <T>(f: (band: number) => T): T[] => Array.from({ length: bandCount }, (_, band) => f(band))

    const bands = byBand.map((b, band) => {
      const iss = issueAt(band)
      const base = baseAt(band)
      return {
        tests: b.tests,
        failRate: share(b.fails, b.tests),
        watchRate: share(b.advisories, b.tests),
        dangerousRate: iss ? share(iss.dangerous, iss.tests) : null,
        baselineFailRate: base ? share(base.fails, base.tests) : null
      }
    })

    const line = (pick: (c: Pair) => number, source: (i: IssueRow) => MotCounts, code: string): (number | null)[] =>
      bandsOf(band => {
        const iss = issueAt(band)
        const c = iss ? source(iss)[code] : undefined
        return iss && c ? share(pick(c), iss.tests) : null
      })
    const total = (pick: (c: Pair) => number, source: (i: IssueRow) => MotCounts, code: string): number =>
      issues.reduce((a, i) => a + pick(source(i)[code] ?? [0, 0]), 0)
    const baseline_ = (pick: (c: Pair) => number, code: string): (number | null)[] =>
      bandsOf(band => {
        const base = baseAt(band)
        const c = base?.groups[code]
        return base && c ? share(pick(c), base.tests) : null
      })
    const byPopularity = <T extends { failTests: number; watchTests: number }>(a: T, b: T): number =>
      b.failTests + b.watchTests - (a.failTests + a.watchTests)

    const groups: MotIssue[] = MOT_GROUP_CODES.map((code: MotGroupCode) => ({
      code,
      fail: line(failOf, i => i.groups, code),
      watch: line(watchOf, i => i.groups, code),
      failTests: total(failOf, i => i.groups, code),
      watchTests: total(watchOf, i => i.groups, code),
      baselineFail: baseline_(failOf, code),
      baselineWatch: baseline_(watchOf, code)
    }))
      .filter(g => g.failTests + g.watchTests > 0)
      .sort(byPopularity)

    const reasonCodes = [...new Set(issues.flatMap(i => Object.keys(i.reasons)))]
    const dictionary = reasonCodes.length
      ? await db.select().from(motReasons).where(inArray(motReasons.code, reasonCodes))
      : []
    const reasons: MotReason[] = dictionary
      .map(d => ({
        code: d.code,
        group: d.groupCode as MotGroupCode,
        item: d.item,
        failText: d.failText,
        watchText: d.watchText,
        fail: line(failOf, i => i.reasons, d.code),
        watch: line(watchOf, i => i.reasons, d.code),
        failTests: total(failOf, i => i.reasons, d.code),
        watchTests: total(watchOf, i => i.reasons, d.code)
      }))
      .sort(byPopularity)
      .slice(0, REASONS_LIMIT)

    return {
      brand,
      model,
      year: year ?? 0,
      match: {
        makeName: row.make,
        modelName: row.model,
        kind,
        how,
        crossMake: row.makeKey !== mk,
        testYears: [years.yearFrom, years.yearTo],
        edgesKm: [...MOT_BAND_EDGES_KM[kind]],
        tests: row.tests,
        window: { from: win[0], to: win[1], widened },
        bands,
        groups,
        reasons
      }
    }
  }
}
