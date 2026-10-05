/**
 * Coverage of `registry.wiki_image` against the registry — replaces ad-hoc SQL.
 *
 *   pnpm wiki-images:coverage
 *
 * A brand/model/year group counts as covered when its year row, else its model-level row, is `ok`. Shown per row status
 * and per model-size tier, by group count and weighted by registered passenger cars (the share of cars that get a photo).
 */
import { createDb } from '@carplates/db'
import { sql } from 'drizzle-orm'

type Line = { tier: string; outcome: string; groups: number; cars: number }

const log = (...m: unknown[]): void => {
  console.log(...m)
}
const pct = (part: number, whole: number): string => (whole ? `${((part / whole) * 100).toFixed(1)}%` : '-')

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    const { rows } = await db.execute<Line>(sql`
      WITH g AS (
        SELECT lower(btrim(brand)) AS brand, lower(btrim(model)) AS model, make_year AS year, count(*)::int AS n
        FROM registry.current_registration
        WHERE kind ILIKE '%легков%' AND btrim(coalesce(brand, '')) <> '' AND btrim(coalesce(model, '')) <> ''
          AND make_year IS NOT NULL
        GROUP BY 1, 2, 3
      ), m AS (
        SELECT brand, model, sum(n) AS total FROM g GROUP BY 1, 2
      )
      SELECT
        CASE WHEN m.total >= 1000 THEN '>=1000 cars' WHEN m.total >= 100 THEN '100-999 cars' ELSE '<100 cars' END AS tier,
        CASE
          WHEN y.status = 'ok' OR mr.status = 'ok' THEN 'photo'
          WHEN coalesce(y.status, mr.status) = 'failed' OR mr.status = 'failed' THEN 'failed (retry pending)'
          WHEN coalesce(y.status, mr.status) = 'not_found' OR mr.status = 'not_found' THEN 'not_found'
          ELSE 'not processed'
        END AS outcome,
        count(*)::int AS groups,
        sum(g.n)::bigint AS cars
      FROM g
      JOIN m USING (brand, model)
      LEFT JOIN registry.wiki_image y ON y.brand = g.brand AND y.model = g.model AND y.year = g.year
      LEFT JOIN registry.wiki_image mr ON mr.brand = g.brand AND mr.model = g.model AND mr.year = 0
      GROUP BY 1, 2
      ORDER BY 1, 2
    `)

    const lines = rows.map(r => ({ ...r, cars: Number(r.cars) }))
    const tiers = [...new Set(lines.map(l => l.tier))]
    for (const tier of [...tiers, 'ALL']) {
      const own = tier === 'ALL' ? lines : lines.filter(l => l.tier === tier)
      const groups = own.reduce((a, l) => a + l.groups, 0)
      const cars = own.reduce((a, l) => a + l.cars, 0)
      log(`\n${tier}: ${groups} group(s), ${cars} car(s)`)
      for (const outcome of [...new Set(own.map(l => l.outcome))].sort()) {
        const g = own.filter(l => l.outcome === outcome).reduce((a, l) => a + l.groups, 0)
        const c = own.filter(l => l.outcome === outcome).reduce((a, l) => a + l.cars, 0)
        log(
          `  ${outcome.padEnd(24)} ${String(g).padStart(8)} groups (${pct(g, groups)})  ${String(c).padStart(10)} cars (${pct(c, cars)})`
        )
      }
    }

    const { rows: byStatus } = await db.execute<{ status: string; origin: string | null; n: number }>(sql`
      SELECT status, origin, count(*)::int AS n FROM registry.wiki_image GROUP BY 1, 2 ORDER BY 1, 2
    `)
    log('\nstored rows by status / origin:')
    for (const r of byStatus) log(`  ${r.status.padEnd(10)} ${(r.origin ?? '-').padEnd(16)} ${r.n}`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
