/**
 * Rebuilds `registry.stats_safety` — the /safety statistics rollup — from `current_registration` + the five
 * `*_ratings` tables.
 *
 *   pnpm db:refresh-safety-stats
 *
 * Each source's rating is normalized to 0–100 (`@carplates/shared` crashScore), matched to a registry model with the
 * same prefix rule the per-plate lookups use, and the applicable generation's scores are averaged into one combined
 * score per (brand, model, make year). Re-run after any registry or ratings ingest.
 */
import {
  cncapRatings,
  createDb,
  euroncapRatings,
  iihsRatings,
  jncapRatings,
  kncapRatings,
  statsSafety
} from '@carplates/db'
import type { StatsSafetyInsert } from '@carplates/db'
import {
  CRASH_SOURCES,
  applicableCrashScore,
  brandCandidateKey,
  cncapScore,
  combineCrashScores,
  euroncapScore,
  iihsScore,
  jncapScore,
  kncapScore,
  makeKey,
  matchRatingRows,
  modelKey
} from '@carplates/shared'
import type { CrashSource, ScoredRating } from '@carplates/shared'
import { sql } from 'drizzle-orm'

const BATCH = 2000

/** Sources whose model naming matches the registry's BMW/Mercedes trim codes only after `brandCandidateKey`. */
const ALIAS_SOURCES: ReadonlySet<CrashSource> = new Set(['euroncap', 'iihs'])

type Group = { brand: string; model: string; makeYear: number; n: number }
type MakeRows = Map<string, ScoredRating[]>

const log = (...m: unknown[]): void => {
  console.log(...m)
}

function addRow(index: MakeRows, mk: string, row: ScoredRating | null): void {
  if (!row) return
  const list = index.get(mk)
  if (list) list.push(row)
  else index.set(mk, [row])
}

const scored = (modelKeyValue: string, year: number | null, score: number | null): ScoredRating | null =>
  year == null || score == null ? null : { modelKey: modelKeyValue, year, score }

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    const index: Record<CrashSource, MakeRows> = {
      euroncap: new Map(),
      jncap: new Map(),
      cncap: new Map(),
      kncap: new Map(),
      iihs: new Map()
    }

    // Safety-Pack-only Euro NCAP entries rate an add-on pack, not the car — the result card skips them too.
    for (const r of await db.select().from(euroncapRatings)) {
      if (!r.safetyPack) addRow(index.euroncap, r.makeKey, scored(r.modelKey, r.ratingYear, euroncapScore(r.stars)))
    }
    for (const r of await db.select().from(jncapRatings)) {
      addRow(index.jncap, r.makeKey, scored(r.modelKey, r.ratingYear, jncapScore(r.overallPct, r.stars)))
    }
    for (const r of await db.select().from(cncapRatings)) {
      addRow(index.cncap, r.makeKey, scored(r.modelKey, r.ratingYear, cncapScore(r.scoreUnit, r.overallScore)))
    }
    for (const r of await db.select().from(kncapRatings)) {
      addRow(index.kncap, r.makeKey, scored(r.modelKey, r.ratingYear, kncapScore(r.overallScore, r.overallClass)))
    }
    for (const r of await db.select().from(iihsRatings)) {
      addRow(index.iihs, r.makeKey, scored(r.modelKey, r.modelYear, iihsScore(r.tests)))
    }
    log(CRASH_SOURCES.map(s => `${s}: ${[...index[s].values()].reduce((n, l) => n + l.length, 0)}`).join(', '))

    const { rows: groups } = await db.execute<Group>(sql`
      SELECT brand, model, make_year AS "makeYear", count(*)::int AS n
      FROM registry.current_registration
      WHERE kind = 'ЛЕГКОВИЙ' AND brand IS NOT NULL AND model IS NOT NULL AND make_year IS NOT NULL
      GROUP BY brand, model, make_year
    `)
    log(`${groups.length} registry group(s)`)

    // The matched rows per source don't depend on the year, so they are computed once per (make, model).
    const modelCache = new Map<string, Record<CrashSource, ScoredRating[]>>()
    const matchedFor = (brand: string, model: string): Record<CrashSource, ScoredRating[]> | null => {
      const mk = makeKey(brand)
      const mdl = modelKey(model)
      if (!mk || !mdl) return null
      const key = `${mk}|${mdl}`
      const cached = modelCache.get(key)
      if (cached) return cached

      const alias = brandCandidateKey(mk, mdl)
      const out = {} as Record<CrashSource, ScoredRating[]>
      for (const source of CRASH_SOURCES) {
        const makeRows = index[source].get(mk) ?? []
        let hits = matchRatingRows(makeRows, mdl)
        if (hits.length === 0 && alias && ALIAS_SOURCES.has(source)) hits = matchRatingRows(makeRows, alias)
        out[source] = hits
      }
      modelCache.set(key, out)
      return out
    }

    const out: StatsSafetyInsert[] = groups.map(g => {
      const matched = matchedFor(g.brand, g.model)
      const scores: Record<CrashSource, number | null> = {
        euroncap: matched ? applicableCrashScore(matched.euroncap, g.makeYear) : null,
        jncap: matched ? applicableCrashScore(matched.jncap, g.makeYear) : null,
        cncap: matched ? applicableCrashScore(matched.cncap, g.makeYear) : null,
        kncap: matched ? applicableCrashScore(matched.kncap, g.makeYear) : null,
        iihs: matched ? applicableCrashScore(matched.iihs, g.makeYear) : null
      }
      const combined = combineCrashScores(scores)
      return {
        brand: g.brand,
        model: g.model,
        makeYear: g.makeYear,
        n: g.n,
        score: combined.score,
        sources: combined.sources,
        euroncapScore: scores.euroncap,
        jncapScore: scores.jncap,
        cncapScore: scores.cncap,
        kncapScore: scores.kncap,
        iihsScore: scores.iihs
      }
    })

    await db.transaction(async tx => {
      await tx.execute(sql`TRUNCATE registry.stats_safety`)
      for (let i = 0; i < out.length; i += BATCH) await tx.insert(statsSafety).values(out.slice(i, i + BATCH))
    })

    const matched = out.filter(r => r.score != null).reduce((s, r) => s + r.n, 0)
    const total = out.reduce((s, r) => s + r.n, 0)
    log(
      `wrote ${out.length} row(s); ${matched} of ${total} passenger cars have a crash rating (${((matched / total) * 100).toFixed(1)}%)`
    )
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
