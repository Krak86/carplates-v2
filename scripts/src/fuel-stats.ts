/**
 * Rebuilds `registry.stats_fuel` — the /fuel statistics rollup — from `current_registration` + `fuel_economy`.
 *
 *   pnpm db:refresh-fuel-stats
 *
 * Runs the same matcher the result card uses (`@carplates/shared` fuelMatch), so a group's CO2 here is exactly what
 * a plate in that group would show. Re-run after any registry ingest or `ingest:fuel`; `ingest:all` does it last.
 */
import { createDb, fuelEconomy, statsFuel } from '@carplates/db'
import type { FuelEconomyRow, StatsFuelInsert } from '@carplates/db'
import { makeKey, matchModelRows, modelKey, registryFuelClass, selectFuelEstimate } from '@carplates/shared'
import { sql } from 'drizzle-orm'

const BATCH = 2000
/** Engine capacity is rounded to this many cc for grouping — fine enough for the ±12% matching, coarse enough to keep groups few. */
const CAPACITY_BUCKET_CC = 100

type Group = {
  brand: string
  model: string
  makeYear: number
  fuel: string | null
  capacityBucket: number | null
  n: number
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    const refRows = await db.select().from(fuelEconomy)
    const byMake = new Map<string, FuelEconomyRow[]>()
    for (const r of refRows) byMake.set(r.makeKey, [...(byMake.get(r.makeKey) ?? []), r])
    log(`loaded ${refRows.length} reference row(s) for ${byMake.size} make(s)`)

    const bucket = sql.raw(String(CAPACITY_BUCKET_CC))
    const { rows: groups } = await db.execute<Group>(sql`
      SELECT brand, model, make_year AS "makeYear", fuel,
             (round(capacity / ${bucket}.0) * ${bucket})::int AS "capacityBucket",
             count(*)::int AS n
      FROM registry.current_registration
      WHERE kind = 'ЛЕГКОВИЙ' AND brand IS NOT NULL AND model IS NOT NULL AND make_year IS NOT NULL
      GROUP BY brand, model, make_year, fuel, 5
    `)
    log(`${groups.length} registry group(s)`)

    // The per-model candidate set doesn't depend on year/fuel/capacity, so it's computed once per (make, model).
    const modelCache = new Map<string, FuelEconomyRow[]>()
    const candidatesFor = (brand: string, model: string): FuelEconomyRow[] => {
      const mk = makeKey(brand)
      const mdl = modelKey(model)
      if (!mk || !mdl) return []
      const key = `${mk}|${mdl}`
      const cached = modelCache.get(key)
      if (cached) return cached
      const rows = matchModelRows(byMake.get(mk) ?? [], mdl)
      modelCache.set(key, rows)
      return rows
    }

    const out: StatsFuelInsert[] = groups.map(g => {
      const estimate = selectFuelEstimate(candidatesFor(g.brand, g.model), {
        year: g.makeYear,
        fuel: g.fuel,
        capacity: g.capacityBucket
      })
      return {
        brand: g.brand,
        model: g.model,
        makeYear: g.makeYear,
        fuel: g.fuel,
        fuelClass: registryFuelClass(g.fuel),
        capacityBucket: g.capacityBucket,
        n: g.n,
        co2GKm: estimate ? (estimate.co2GKmMin + estimate.co2GKmMax) / 2 : null,
        l100km:
          estimate?.l100kmMin != null && estimate.l100kmMax != null
            ? (estimate.l100kmMin + estimate.l100kmMax) / 2
            : null,
        source: estimate?.source ?? null,
        cycle: estimate?.cycle ?? null
      }
    })

    await db.transaction(async tx => {
      await tx.execute(sql`TRUNCATE registry.stats_fuel`)
      for (let i = 0; i < out.length; i += BATCH) await tx.insert(statsFuel).values(out.slice(i, i + BATCH))
    })

    const matched = out.filter(r => r.co2GKm != null).reduce((s, r) => s + r.n, 0)
    const total = out.reduce((s, r) => s + r.n, 0)
    log(
      `wrote ${out.length} row(s); ${matched} of ${total} passenger cars matched (${((matched / total) * 100).toFixed(1)}%)`
    )
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
