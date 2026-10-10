/**
 * Rebuilds `registry.stats_model_grouped` — `stats_by_model` with the ZAZ / Daewoo / Chevrolet spellings of one model
 * folded into a family row (`modelFamily` in @carplates/shared) — for the /stats top-models leaderboard.
 *
 *   pnpm db:refresh-model-family-stats
 *
 * Reads `stats_by_model` only (no registry scan, seconds), so it must run after `db:refresh-stats`. Folded counts are
 * sums: a plate typed under two spellings counts twice. `db:refresh-derived` runs it.
 */
import { createDb, statsByModel, statsModelGrouped } from '@carplates/db'
import type { StatsModelGroupedInsert } from '@carplates/db'
import { modelFamily } from '@carplates/shared'
import { sql } from 'drizzle-orm'

const BATCH = 2000

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    const raw = await db.select().from(statsByModel)
    const grouped = new Map<string, StatsModelGroupedInsert>()
    let folded = 0

    for (const r of raw) {
      const family = modelFamily(r.brand, r.model)
      const brand = family?.brand ?? r.brand
      const model = family?.family ?? r.model
      if (family) folded++
      const key = `${brand}|${model}`
      const cur = grouped.get(key)
      if (cur) {
        cur.totalRows += r.totalRows
        cur.distinctPlates += r.distinctPlates
        cur.distinctVins += r.distinctVins
      } else {
        grouped.set(key, {
          brand,
          model,
          totalRows: r.totalRows,
          distinctPlates: r.distinctPlates,
          distinctVins: r.distinctVins
        })
      }
    }
    const values = [...grouped.values()]

    await db.transaction(async tx => {
      await tx.execute(sql`TRUNCATE registry.stats_model_grouped`)
      for (let i = 0; i < values.length; i += BATCH) {
        await tx.insert(statsModelGrouped).values(values.slice(i, i + BATCH))
      }
    })
    console.log(`${raw.length} raw pair(s) -> ${values.length} row(s) (${folded} pair(s) folded into families)`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
