/**
 * Rebuilds `registry.stats_imports` — passenger cars currently registered, split into used imports and cars sold through a
 * trade organization, per year of that operation, model and VIN build country — for the /read/imports article.
 *
 *   pnpm db:refresh-imports-stats
 *
 * Why `registrations` and not only `current_registration`: the latter keeps the latest operation per plate, so a car imported
 * in 2016 and resold since looks like a plain resale. The import flag therefore comes from the whole history; the brand, model,
 * VIN and "still registered" status come from `current_registration`. Origin rule: `IMPORT_OPER_CODES` or the 0011 keywords
 * (ввезен / привезен) minus new-car and de-registration operations — the same as `isImportOperation`; 'dealer' = торг without
 * an import. Plates the 2026 plate removal left null are not in `current_registration` and so are not counted.
 * Re-run after a registry ingest; `db:refresh-derived` does it.
 */
import { createDb, statsImports } from '@carplates/db'
import type { StatsImportsInsert } from '@carplates/db'
import { IMPORT_OPER_CODES, lookupWmi } from '@carplates/shared'
import { sql } from 'drizzle-orm'

const BATCH = 2000
const PASSENGER_KIND = 'ЛЕГКОВИЙ'
/** Operation years outside this range are typos. */
const YEAR_RANGE = [1995, new Date().getFullYear()] as const

type Row = { origin: string; regYear: number; wmi: string | null; brand: string; model: string; n: number }

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    const codes = sql.join(
      [...IMPORT_OPER_CODES].map(c => sql`${c}`),
      sql`, `
    )
    const { rows } = await db.execute<Row>(sql`
      SELECT origin, reg_year AS "regYear", wmi, brand, model, count(*)::int AS n
      FROM (
        SELECT o.origin, o.reg_year, left(upper(btrim(c.vin)), 3) AS wmi, c.model,
               btrim(CASE WHEN tidy LIKE '% ' || c.model THEN left(tidy, length(tidy) - length(c.model) - 1) ELSE tidy END) AS brand
        FROM (
          SELECT plate,
                 CASE WHEN bool_or(is_import) THEN 'import' ELSE 'dealer' END AS origin,
                 extract(year FROM CASE WHEN bool_or(is_import) THEN min(d_reg) FILTER (WHERE is_import)
                                        ELSE min(d_reg) FILTER (WHERE is_dealer) END)::int AS reg_year
          FROM (
            SELECT plate, d_reg,
                   (oper_code IN (${codes})
                    OR ((oper_name ILIKE '%ввезен%' OR oper_name ILIKE '%привезен%')
                        AND NOT (oper_name ILIKE '%первин%' OR oper_name ILIKE '%нового%' OR oper_name ILIKE '%знят%'))) AS is_import,
                   (oper_name ILIKE '%торг%') AS is_dealer
            FROM registry.registrations
            WHERE plate IS NOT NULL AND d_reg IS NOT NULL
              AND (oper_code IN (${codes}) OR oper_name ILIKE '%ввезен%' OR oper_name ILIKE '%привезен%' OR oper_name ILIKE '%торг%')
          ) ops
          GROUP BY plate
          HAVING bool_or(is_import) OR bool_or(is_dealer)
        ) o
        JOIN (
          SELECT plate, vin, model, btrim(regexp_replace(brand, '[[:space:]]+', ' ', 'g')) AS tidy
          FROM registry.current_registration
          WHERE kind = ${PASSENGER_KIND} AND brand IS NOT NULL AND model IS NOT NULL
        ) c ON c.plate = o.plate
        WHERE o.reg_year BETWEEN ${YEAR_RANGE[0]} AND ${YEAR_RANGE[1]}
      ) t
      WHERE brand <> ''
      GROUP BY origin, reg_year, wmi, brand, model
    `)

    // Fold the 3-character WMIs into countries (the WMI table lives in TS, not SQL).
    const folded = new Map<string, StatsImportsInsert>()
    for (const r of rows) {
      const country = r.wmi?.length === 3 ? (lookupWmi(r.wmi)?.country ?? '') : ''
      const key = `${r.origin}|${r.regYear}|${country}|${r.brand}|${r.model}`
      const row = folded.get(key)
      if (row) row.n += r.n
      else folded.set(key, { origin: r.origin, regYear: r.regYear, country, brand: r.brand, model: r.model, n: r.n })
    }
    const all = [...folded.values()]

    await db.transaction(async tx => {
      await tx.execute(sql`TRUNCATE registry.stats_imports`)
      for (let i = 0; i < all.length; i += BATCH) await tx.insert(statsImports).values(all.slice(i, i + BATCH))
    })
    const imported = all.filter(r => r.origin === 'import').reduce((sum, r) => sum + r.n, 0)
    log(`wrote ${all.length} row(s) covering ${imported} imported passenger car(s)`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
