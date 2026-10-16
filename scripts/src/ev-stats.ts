/**
 * Rebuilds `registry.stats_ev` — electrified passenger cars per powertrain, model year, plate region and model — from
 * `current_registration`, for the /read/electric article.
 *
 *   pnpm db:refresh-ev-stats
 *
 * Rows with powertrain `all` (empty brand / model) hold the whole passenger fleet per year and region.
 * Rows with powertrain `all` (empty brand / model) hold the whole passenger fleet per year and region.
 * `bev` = the registry fuel is electricity only; `hybrid` = electricity next to petrol, diesel or gas (the registry does not
 * tell plug-in from self-charging hybrids). Re-run after a registry ingest; `db:refresh-derived` does it.
 */
import { createDb, statsEv } from '@carplates/db'
import type { StatsEvInsert } from '@carplates/db'
import { fuelKeyword } from '@carplates/shared'
import { sql } from 'drizzle-orm'

const BATCH = 2000
const PASSENGER_KIND = 'ЛЕГКОВИЙ'
/** Model years outside this range are typos. */
const YEAR_RANGE = [1990, new Date().getFullYear() + 1] as const

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    const electric = `%${fuelKeyword('electric')}%`
    const { rows } = await db.execute<StatsEvInsert>(sql`
      SELECT powertrain, make_year AS "makeYear", region, brand, model, count(*)::int AS n
      FROM (
        SELECT powertrain, make_year, region, model,
               btrim(CASE WHEN tidy LIKE '% ' || model THEN left(tidy, length(tidy) - length(model) - 1) ELSE tidy END) AS brand
        FROM (
          SELECT CASE WHEN btrim(c.fuel) = ${fuelKeyword('electric')} THEN 'bev' ELSE 'hybrid' END AS powertrain,
                 c.make_year, coalesce(r.region, '') AS region, c.model,
                 btrim(regexp_replace(c.brand, '[[:space:]]+', ' ', 'g')) AS tidy
          FROM registry.current_registration c
          LEFT JOIN registry.plate_regions r ON r.prefix = left(c.plate, 2)
          WHERE c.kind = ${PASSENGER_KIND} AND c.fuel ILIKE ${electric}
            AND c.make_year BETWEEN ${YEAR_RANGE[0]} AND ${YEAR_RANGE[1]}
            AND c.brand IS NOT NULL AND c.model IS NOT NULL
        ) cleaned
      ) t
      WHERE brand <> ''
      GROUP BY powertrain, make_year, region, brand, model
    `)

    // The whole passenger fleet per model year and region (brand / model left empty) so a share can be shown.
    const { rows: fleet } = await db.execute<StatsEvInsert>(sql`
      SELECT 'all' AS powertrain, c.make_year AS "makeYear", coalesce(r.region, '') AS region, '' AS brand, '' AS model,
             count(*)::int AS n
      FROM registry.current_registration c
      LEFT JOIN registry.plate_regions r ON r.prefix = left(c.plate, 2)
      WHERE c.kind = ${PASSENGER_KIND} AND c.make_year BETWEEN ${YEAR_RANGE[0]} AND ${YEAR_RANGE[1]}
      GROUP BY c.make_year, coalesce(r.region, '')
    `)

    await db.transaction(async tx => {
      await tx.execute(sql`TRUNCATE registry.stats_ev`)
      const all = [...rows, ...fleet]
      for (let i = 0; i < all.length; i += BATCH) await tx.insert(statsEv).values(all.slice(i, i + BATCH))
    })
    const total = rows.reduce((sum, r) => sum + r.n, 0)
    log(`wrote ${rows.length + fleet.length} row(s) covering ${total} electrified passenger car(s)`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
