/**
 * Dump / load of `registry.rdw_recall_texts` — the machine translations (nllb, GPU-hours to produce) of RDW and Transport
 * Canada recall texts. Kept apart from rdw-recalls-translate.ts so a CSV load does not import the ML runtime.
 *
 *   pnpm export:recall-texts:csv    # table -> seed-data/recall-texts.csv.gz
 *   pnpm ingest:recall-texts:csv    # seed-data/recall-texts.csv.gz -> table (insert-or-ignore; run after the recalls CSVs)
 */
import { createDb, rdwRecallTexts } from '@carplates/db'
import type { RdwRecallTextInsert } from '@carplates/db'

import { readCsv, writeCsv } from './csv-io.js'

const COLUMNS = ['text_hash', 'lang', 'engine', 'text', 'quality', 'translated_at'] as const
const BATCH = 500

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const exportPath = argv[argv.indexOf('--export-csv') + 1]
  const fromPath = argv[argv.indexOf('--from-csv') + 1]
  if (!argv.includes('--export-csv') && !argv.includes('--from-csv'))
    throw new Error('usage: recall-texts.ts --export-csv <path> | --from-csv <path>')

  const { db, close } = createDb()
  try {
    if (argv.includes('--export-csv') && exportPath) {
      const rows = await db
        .select()
        .from(rdwRecallTexts)
        .orderBy(rdwRecallTexts.textHash, rdwRecallTexts.lang, rdwRecallTexts.engine)
      const size = await writeCsv(
        exportPath,
        COLUMNS,
        rows.map(r => ({
          text_hash: r.textHash,
          lang: r.lang,
          engine: r.engine,
          text: r.text,
          quality: r.quality ?? '',
          translated_at: r.translatedAt.toISOString()
        }))
      )
      log(`exported ${rows.length} text(s) to ${exportPath} (${(size / 1024).toFixed(0)} KB)`)
    } else if (fromPath) {
      const csv = await readCsv(fromPath)
      if (!csv) {
        log(`no seed CSV at ${fromPath} yet — skipped (run export:recall-texts:csv)`)
        return
      }
      const rows: RdwRecallTextInsert[] = csv.records.map(r => ({
        textHash: r.text_hash!,
        lang: r.lang!,
        engine: r.engine!,
        text: r.text!,
        quality: r.quality || null,
        translatedAt: new Date(r.translated_at!)
      }))
      for (let i = 0; i < rows.length; i += BATCH)
        await db
          .insert(rdwRecallTexts)
          .values(rows.slice(i, i + BATCH))
          .onConflictDoNothing()
      log(`imported ${rows.length} text(s) from ${csv.path}`)
    }
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
