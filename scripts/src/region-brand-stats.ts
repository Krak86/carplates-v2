/**
 * Rebuilds `registry.stats_region_brand`: the 5 biggest passenger-car brands of every plate region (brands folded by logo
 * slug, so `ВАЗ` and `ВАЗ 21063` count together) plus the region's whole passenger fleet, from `current_registration`, for the
 * brand-logo layer of the /stats map.
 *
 *   pnpm db:refresh-region-brand-stats
 *
 * Re-run after a registry ingest; `db:refresh-derived` does it.
 */
import { createDb, statsRegionBrand } from '@carplates/db'
import { sql } from 'drizzle-orm'

import { foldRegionBrands } from './region-brand-fold.js'
import type { RegionBrandRow } from './region-brand-fold.js'

const PASSENGER_KIND = 'ЛЕГКОВИЙ'

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    const { rows } = await db.execute<RegionBrandRow>(sql`
      SELECT region,
             btrim(CASE WHEN tidy LIKE '% ' || model THEN left(tidy, length(tidy) - length(model) - 1) ELSE tidy END) AS brand,
             count(*)::int AS n
      FROM (
        SELECT r.region, c.model, btrim(regexp_replace(c.brand, '[[:space:]]+', ' ', 'g')) AS tidy
        FROM registry.current_registration c
        JOIN registry.plate_regions r ON r.prefix = left(c.plate, 2)
        WHERE c.kind = ${PASSENGER_KIND} AND c.brand IS NOT NULL AND c.model IS NOT NULL
      ) t
      GROUP BY region, 2
    `)
    const folded = foldRegionBrands(rows.filter(r => r.brand !== ''))

    await db.transaction(async tx => {
      await tx.execute(sql`TRUNCATE registry.stats_region_brand`)
      if (folded.length) await tx.insert(statsRegionBrand).values(folded)
    })
    log(`wrote ${folded.length} row(s) for ${new Set(folded.map(r => r.region)).size} region(s)`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
