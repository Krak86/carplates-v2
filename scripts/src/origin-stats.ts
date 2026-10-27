/**
 * Rebuilds `registry.stats_origin` — passenger cars currently registered by model year, the brand's home country and the
 * country the VIN says the car was assembled in — for the /stats "Where cars come from" panel.
 *
 *   pnpm db:refresh-origin-stats
 *
 * Same rules as the VIN page (ORIGIN_PLAN.md): the brand country is the `brand_origin_period` row in force in the model year
 * (`pickByYear`), the plant country the `wmi_prefix` row (then the curated `lookupWmi`) of a standard 17-character VIN; both
 * go through `countryAtYear`, so a 1985 Skoda is Czechoslovakia and a Soviet-built car is the USSR. Nothing is guessed: a
 * brand with no origin row or a car with no standard VIN counts under '' (unknown). Re-run after a registry ingest or
 * `ingest:brand-origin` / `ingest:wmi`; `db:refresh-derived` does it.
 */
import { brandOriginPeriod, createDb, statsOrigin, wmiPrefix } from '@carplates/db'
import type { StatsOriginInsert } from '@carplates/db'
import { brandSlug, countryAtYear, lookupWmi, pickByYear } from '@carplates/shared'
import type { Dated } from '@carplates/shared'
import { sql } from 'drizzle-orm'

const BATCH = 2000
const PASSENGER_KIND = 'ЛЕГКОВИЙ'
/** The VIN standard starts in 1981; earlier (and Soviet) chassis numbers carry no readable plant. */
const FIRST_VIN_YEAR = 1981
const YEAR_RANGE = [1900, new Date().getFullYear() + 1] as const

type Row = { makeYear: number; brand: string; wmi: string | null; n: number }

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    const [periodRows, wmiRows] = await Promise.all([db.select().from(brandOriginPeriod), db.select().from(wmiPrefix)])
    const periods = new Map<string, (Dated & { countryCode: string })[]>()
    for (const p of periodRows) periods.set(p.brandSlug, [...(periods.get(p.brandSlug) ?? []), p])
    const wmis = new Map<string, (Dated & { countryCode: string | null })[]>()
    for (const w of wmiRows) wmis.set(w.wmi, [...(wmis.get(w.wmi) ?? []), w])

    const { rows } = await db.execute<Row>(sql`
      SELECT make_year AS "makeYear", brand, wmi, count(*)::int AS n
      FROM (
        SELECT CASE WHEN make_year BETWEEN ${YEAR_RANGE[0]} AND ${YEAR_RANGE[1]} THEN make_year ELSE 0 END AS make_year,
               CASE WHEN upper(btrim(vin)) ~ '^[A-HJ-NPR-Z0-9]{17}$' THEN left(upper(btrim(vin)), 3) END AS wmi,
               btrim(CASE WHEN tidy LIKE '% ' || model THEN left(tidy, length(tidy) - length(model) - 1) ELSE tidy END) AS brand
        FROM (
          SELECT make_year, vin, model, btrim(regexp_replace(brand, '[[:space:]]+', ' ', 'g')) AS tidy
          FROM registry.current_registration
          WHERE kind = ${PASSENGER_KIND} AND brand IS NOT NULL AND model IS NOT NULL
        ) c
      ) t
      GROUP BY make_year, brand, wmi
    `)

    const folded = new Map<string, StatsOriginInsert>()
    for (const r of rows) {
      const year = r.makeYear > 0 ? r.makeYear : null
      const slug = brandSlug(r.brand)
      const brandCode = slug ? pickByYear(periods.get(slug) ?? [], year)?.countryCode : null
      const brandCountry = brandCode ? countryAtYear(brandCode, year) : ''

      let plantCountry = ''
      if (r.wmi && (year === null || year >= FIRST_VIN_YEAR)) {
        const code = pickByYear(wmis.get(r.wmi) ?? [], year)?.countryCode ?? lookupWmi(r.wmi)?.country
        plantCountry = code ? countryAtYear(code, year) : ''
      }

      const key = `${r.makeYear}|${brandCountry}|${plantCountry}`
      const row = folded.get(key)
      if (row) row.n += r.n
      else folded.set(key, { makeYear: r.makeYear, brandCountry, plantCountry, n: r.n })
    }
    const all = [...folded.values()]

    await db.transaction(async tx => {
      await tx.execute(sql`TRUNCATE registry.stats_origin`)
      for (let i = 0; i < all.length; i += BATCH) await tx.insert(statsOrigin).values(all.slice(i, i + BATCH))
    })
    const total = all.reduce((sum, r) => sum + r.n, 0)
    const known = (pick: (r: StatsOriginInsert) => string): number =>
      all.filter(r => pick(r) !== '').reduce((sum, r) => sum + r.n, 0)
    log(
      `wrote ${all.length} row(s) for ${total} passenger car(s): brand country known for ${known(r => r.brandCountry ?? '')}, plant country for ${known(r => r.plantCountry ?? '')}`
    )
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
