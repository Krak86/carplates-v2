/**
 * Dumps the ZAZ / Daewoo raw registry (brand, model) → canonical family mapping (`modelFamily` in @carplates/shared) with
 * vehicle counts and the model-year span, so the grouping can be reviewed in a spreadsheet.
 *
 *   pnpm export:model-families:csv                         # → scripts/.data/model-families.csv
 *   pnpm export:model-families:csv -- --out ./x.csv
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { createDb } from '@carplates/db'
import { modelFamily } from '@carplates/shared'
import { sql } from 'drizzle-orm'
import { stringify } from 'csv-stringify/sync'

type Row = { brand: string | null; model: string | null; n: number; y1: number | null; y99: number | null }

const outIndex = process.argv.indexOf('--out')
const OUT =
  outIndex > 0 && process.argv[outIndex + 1]
    ? process.argv[outIndex + 1]!
    : join(import.meta.dirname, '..', '.data', 'model-families.csv')

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    const { rows } = await db.execute<Row>(sql`
      SELECT brand, model, count(*)::int AS n,
             (percentile_disc(0.01) WITHIN GROUP (ORDER BY make_year))::int AS y1,
             (percentile_disc(0.99) WITHIN GROUP (ORDER BY make_year))::int AS y99
      FROM registry.registrations
      WHERE brand ~* '^(ЗАЗ|ZAZ|DAEWOO|FSO|CHEVROLET)'
      GROUP BY brand, model`)
    const out = rows
      .map(r => ({ r, f: modelFamily(r.brand ?? '', r.model ?? '') }))
      .filter(x => x.f)
      .sort((a, b) => a.f!.brand.localeCompare(b.f!.brand) || a.f!.family.localeCompare(b.f!.family) || b.r.n - a.r.n)
      .map(({ r, f }) => [f!.brand, f!.family, r.brand, r.model, r.n, r.y1, r.y99])
    await mkdir(dirname(OUT), { recursive: true })
    await writeFile(
      OUT,
      stringify(out, {
        header: true,
        columns: ['family_brand', 'family', 'raw_brand', 'raw_model', 'vehicles', 'year_p1', 'year_p99']
      })
    )
    console.log(`wrote ${out.length} mapped pairs → ${OUT}`)
  } finally {
    await close()
  }
}

await main()
