/**
 * Loads the hand-curated model plants (`seed-data/model-plants.csv`, one Wikipedia source per row) into `registry.model_plant`.
 * The CSV is the source of truth and is edited by hand, so there is no export: a load validates it and replaces the table.
 *
 *   pnpm ingest:model-plants             # validate + replace the table
 *   pnpm ingest:model-plants --dry-run   # validate + count, write nothing
 */
import { join } from 'node:path'

import { createDb, modelPlant } from '@carplates/db'
import { sql } from 'drizzle-orm'

import { readCsv } from './csv-io.js'
import { parseModelPlants } from './model-plants-parse.js'

const CSV_PATH = join(import.meta.dirname, '..', 'seed-data', 'model-plants.csv')
const BATCH = 1000

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const csv = await readCsv(CSV_PATH)
  if (!csv) {
    console.log(`skipped: no model plants CSV at ${CSV_PATH}`)
    return
  }
  const { rows, errors } = parseModelPlants(csv.records)
  if (errors.length > 0) {
    console.error(`${errors.length} invalid row(s) in ${csv.path}:\n${errors.join('\n')}`)
    process.exit(1)
  }
  const models = new Set(rows.map(r => `${r.brandSlug}/${r.modelSlug}`)).size
  console.log(`${csv.records.length} plant row(s) -> ${rows.length} model plant(s) for ${models} model(s)`)
  if (dryRun) {
    console.log('dry-run: nothing written')
    return
  }
  const { db, close } = createDb()
  try {
    await db.transaction(async tx => {
      await tx.execute(sql`TRUNCATE registry.model_plant`)
      for (let i = 0; i < rows.length; i += BATCH)
        await tx
          .insert(modelPlant)
          .values(rows.slice(i, i + BATCH))
          .onConflictDoNothing()
    })
    console.log(`loaded ${rows.length} model plant(s)`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
