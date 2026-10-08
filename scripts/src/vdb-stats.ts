/**
 * Rebuilds `registry.stats_vdb` — the /stats markets panel rollup — from `current_registration` + `vdb_models`.
 *
 *   pnpm db:refresh-vdb-stats
 *
 * Runs the same matcher the result card chips use (`matchVdbModel` in `@carplates/shared`), so a model's decile here
 * is exactly what a plate of that model shows. Re-run after any registry ingest or `ingest:vehiclesdb`; `ingest:all`
 * does it last.
 */
import { createDb, statsVdb, vdbModels } from '@carplates/db'
import type { StatsVdbInsert, VdbModelRow } from '@carplates/db'
import { isUkraineOnly, makeKey, matchVdbModelAcrossMakes, vdbRelatedMakeKeys } from '@carplates/shared'
import { sql } from 'drizzle-orm'

const BATCH = 2000

type Group = { brand: string; model: string; n: number }

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    const refRows = await db.select().from(vdbModels)
    const byMake = new Map<string, VdbModelRow[]>()
    for (const r of refRows) byMake.set(r.makeKey, [...(byMake.get(r.makeKey) ?? []), r])
    log(`loaded ${refRows.length} catalog row(s) for ${byMake.size} make(s)`)

    const { rows: groups } = await db.execute<Group>(sql`
      SELECT brand, model, count(*)::int AS n
      FROM registry.current_registration
      WHERE kind = 'ЛЕГКОВИЙ' AND brand IS NOT NULL AND model IS NOT NULL
      GROUP BY brand, model
    `)
    log(`${groups.length} registry group(s)`)

    const perModel = new Map<string, StatsVdbInsert>()
    let unmatched = 0
    for (const g of groups) {
      const mk = makeKey(g.brand)
      const found = mk
        ? matchVdbModelAcrossMakes(
            vdbRelatedMakeKeys(mk, g.model).flatMap(k => byMake.get(k) ?? []),
            mk,
            g.model
          )
        : null
      if (!found) {
        unmatched += g.n
        continue
      }
      const { row } = found
      const cur = perModel.get(row.id)
      if (cur) cur.n += g.n
      else
        perModel.set(row.id, {
          vdbId: row.id,
          makeName: row.makeName,
          modelName: row.modelName,
          globalDecile: row.globalDecile,
          countries: row.countries,
          uaOnly: isUkraineOnly(row),
          n: g.n
        })
    }

    const out: StatsVdbInsert[] = [...perModel.values()]
    if (unmatched > 0) out.push({ vdbId: null, makeName: null, modelName: null, globalDecile: null, n: unmatched })

    await db.transaction(async tx => {
      await tx.execute(sql`TRUNCATE registry.stats_vdb`)
      for (let i = 0; i < out.length; i += BATCH) await tx.insert(statsVdb).values(out.slice(i, i + BATCH))
    })

    const matched = [...perModel.values()].reduce((s, r) => s + r.n, 0)
    log(
      `wrote ${out.length} row(s); ${matched} of ${matched + unmatched} passenger cars matched (${((matched / (matched + unmatched)) * 100).toFixed(1)}%)`
    )
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
