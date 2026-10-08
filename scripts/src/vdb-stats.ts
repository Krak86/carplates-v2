/**
 * Rebuilds `registry.stats_vdb` — the /stats markets panel rollup, per vehicle class (car, motorcycle, truck, bus) — from `current_registration` + `vdb_models`.
 *
 *   pnpm db:refresh-vdb-stats
 *
 * Runs the same matcher the result card chips use (`matchVdbModel` in `@carplates/shared`), so a model's decile here
 * is exactly what a plate of that model shows. Re-run after any registry ingest or `ingest:vehiclesdb`; `ingest:all`
 * does it last.
 */
import { createDb, statsVdb, vdbModels } from '@carplates/db'
import type { StatsVdbInsert, VdbModelRow } from '@carplates/db'
import {
  isUkraineOnly,
  makeKey,
  matchVdbModelAcrossMakes,
  vdbCatalogKinds,
  vdbRelatedMakeKeys,
  VDB_VEHICLE_CLASSES,
  vdbVehicleClass,
  type VdbVehicleClass
} from '@carplates/shared'
import { sql } from 'drizzle-orm'

const BATCH = 2000
/** Registry `kind` values that map to a vehicle class (see `vdbVehicleClass`). */
const KINDS = ['ЛЕГКОВИЙ', 'МОТОЦИКЛ', 'МОТОТРИЦИКЛ', 'КВАДРОЦИКЛ', 'ТРИЦИКЛ', 'МОПЕД', 'ВАНТАЖНИЙ', 'АВТОБУС']

type Group = { kind: string; brand: string; model: string; n: number }

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
      SELECT kind, brand, model, count(*)::int AS n
      FROM registry.current_registration
      WHERE kind IN (${sql.join(
        KINDS.map(k => sql`${k}`),
        sql`, `
      )}) AND brand IS NOT NULL AND model IS NOT NULL
      GROUP BY kind, brand, model
    `)
    log(`${groups.length} registry group(s)`)

    const perModel = new Map<string, StatsVdbInsert>()
    const unmatched = new Map<VdbVehicleClass, number>()
    for (const g of groups) {
      const cls = vdbVehicleClass(g.kind)
      if (!cls) continue
      const mk = makeKey(g.brand)
      const found = mk
        ? matchVdbModelAcrossMakes(
            vdbRelatedMakeKeys(mk, g.model).flatMap(k => byMake.get(k) ?? []),
            mk,
            g.model,
            vdbCatalogKinds(cls)
          )
        : null
      if (!found) {
        unmatched.set(cls, (unmatched.get(cls) ?? 0) + g.n)
        continue
      }
      const { row } = found
      const key = `${cls}|${row.id}`
      const cur = perModel.get(key)
      if (cur) cur.n += g.n
      else
        perModel.set(key, {
          vdbId: row.id,
          vehicleKind: cls,
          makeName: row.makeName,
          modelName: row.modelName,
          globalDecile: row.globalDecile,
          countries: row.countries,
          uaOnly: isUkraineOnly(row),
          n: g.n
        })
    }

    const out: StatsVdbInsert[] = [...perModel.values()]
    for (const [cls, n] of unmatched)
      out.push({ vdbId: null, vehicleKind: cls, makeName: null, modelName: null, globalDecile: null, n })

    await db.transaction(async tx => {
      await tx.execute(sql`TRUNCATE registry.stats_vdb`)
      for (let i = 0; i < out.length; i += BATCH) await tx.insert(statsVdb).values(out.slice(i, i + BATCH))
    })

    for (const cls of VDB_VEHICLE_CLASSES) {
      const matched = [...perModel.values()].filter(r => r.vehicleKind === cls).reduce((s, r) => s + r.n, 0)
      const total = matched + (unmatched.get(cls) ?? 0)
      log(`${cls}: ${matched} of ${total} matched (${total ? ((matched / total) * 100).toFixed(1) : '0'}%)`)
    }
    log(`wrote ${out.length} row(s)`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
