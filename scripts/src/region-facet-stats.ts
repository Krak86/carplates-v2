/**
 * Rebuilds `registry.stats_region_facet` — per plate region, the biggest passenger-car models, every fuel class and the
 * biggest brand home countries, plus the region's passenger fleet — from `current_registration`, for the /stats map modes.
 *
 *   pnpm db:refresh-region-facet-stats
 *
 * Fuel goes through `registryFuelClass`, the brand country through the same `brand_origin_period` rules as
 * `origin-stats.ts` (nothing guessed: a brand with no origin row is left out of the origin ranking but counts in the fleet).
 * Re-run after a registry ingest or `ingest:brand-origin`; `db:refresh-derived` does it.
 */
import { brandOriginPeriod, createDb, statsRegionFacet } from '@carplates/db'
import type { StatsRegionFacetInsert } from '@carplates/db'
import { brandSlug, countryAtYear, pickByYear, registryFuelClass } from '@carplates/shared'
import type { Dated } from '@carplates/shared'
import { sql } from 'drizzle-orm'

import { foldFacet } from './region-facet-fold.js'
import type { FacetCount } from './region-facet-fold.js'

const BATCH = 2000
const PASSENGER_KIND = 'ЛЕГКОВИЙ'
const TOP_PER_REGION = 5
const YEAR_RANGE = [1900, new Date().getFullYear() + 1] as const

type BrandRow = { region: string; makeYear: number; brand: string; model: string; n: number }
type FuelRow = { region: string; fuel: string | null; n: number }

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    const periodRows = await db.select().from(brandOriginPeriod)
    const periods = new Map<string, (Dated & { countryCode: string })[]>()
    for (const p of periodRows) periods.set(p.brandSlug, [...(periods.get(p.brandSlug) ?? []), p])

    const { rows } = await db.execute<BrandRow>(sql`
      SELECT region, make_year AS "makeYear", model,
             btrim(CASE WHEN tidy LIKE '% ' || model THEN left(tidy, length(tidy) - length(model) - 1) ELSE tidy END) AS brand,
             count(*)::int AS n
      FROM (
        SELECT r.region, c.model,
               CASE WHEN c.make_year BETWEEN ${YEAR_RANGE[0]} AND ${YEAR_RANGE[1]} THEN c.make_year ELSE 0 END AS make_year,
               btrim(regexp_replace(c.brand, '[[:space:]]+', ' ', 'g')) AS tidy
        FROM registry.current_registration c
        JOIN registry.plate_regions r ON r.prefix = left(c.plate, 2)
        WHERE c.kind = ${PASSENGER_KIND} AND c.brand IS NOT NULL AND c.model IS NOT NULL
      ) t
      GROUP BY region, make_year, model, 4
    `)
    const { rows: fuelRows } = await db.execute<FuelRow>(sql`
      SELECT r.region, btrim(c.fuel) AS fuel, count(*)::int AS n
      FROM registry.current_registration c
      JOIN registry.plate_regions r ON r.prefix = left(c.plate, 2)
      WHERE c.kind = ${PASSENGER_KIND} AND c.brand IS NOT NULL AND c.model IS NOT NULL
      GROUP BY r.region, btrim(c.fuel)
    `)

    const fleet = new Map<string, number>()
    const models: FacetCount[] = []
    const origins: FacetCount[] = []
    for (const r of rows) {
      if (r.brand === '') continue
      fleet.set(r.region, (fleet.get(r.region) ?? 0) + r.n)

      const slug = brandSlug(r.brand)
      models.push({
        region: r.region,
        key: `${slug ?? r.brand.toUpperCase()} ${r.model.toUpperCase()}`,
        value: `${r.brand} ${r.model}`,
        n: r.n
      })

      const year = r.makeYear > 0 ? r.makeYear : null
      const code = slug ? pickByYear(periods.get(slug) ?? [], year)?.countryCode : null
      if (code) {
        const country = countryAtYear(code, year)
        origins.push({ region: r.region, key: country, value: country, n: r.n })
      }
    }

    const fuels = new Map<string, number>()
    for (const r of fuelRows) {
      const key = `${r.region}|${registryFuelClass(r.fuel)}`
      fuels.set(key, (fuels.get(key) ?? 0) + r.n)
    }
    const fuelFacet: StatsRegionFacetInsert[] = [...fuels]
      .map(([key, n]) => {
        const [region = '', value = ''] = key.split('|')
        return { facet: 'fuel', region, value, n }
      })
      .filter(r => r.value !== 'unknown')

    const all: StatsRegionFacetInsert[] = [
      ...[...fleet].map(([region, n]) => ({ facet: 'fleet', region, value: '', n })),
      ...foldFacet('model', models, TOP_PER_REGION),
      ...foldFacet('origin', origins, TOP_PER_REGION),
      ...fuelFacet
    ]

    await db.transaction(async tx => {
      await tx.execute(sql`TRUNCATE registry.stats_region_facet`)
      for (let i = 0; i < all.length; i += BATCH) await tx.insert(statsRegionFacet).values(all.slice(i, i + BATCH))
    })
    log(`wrote ${all.length} row(s) for ${fleet.size} region(s)`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
