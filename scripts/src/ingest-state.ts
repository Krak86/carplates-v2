import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/**
 * "Rows were loaded but the 2026 plate backfill has not run yet" marker. A file in the (persistent) `.data` folder, not a DB row:
 * `ingested_resources.ingested_at` feeds the public data-version marker, which a bookkeeping row must not move.
 * Set by any ingest that inserts rows; cleared by `--backfill-plates`. `ingest:full` runs the snapshot + backfill + refreshes
 * only while it is set, so a run with nothing new is one CKAN call, and a run killed half-way is finished by the next one.
 */
export const BACKFILL_PENDING_FILE = join(import.meta.dirname, '..', '.data', 'backfill-pending')

export async function markBackfillPending(): Promise<void> {
  await mkdir(dirname(BACKFILL_PENDING_FILE), { recursive: true })
  await writeFile(BACKFILL_PENDING_FILE, `${new Date().toISOString()}\n`)
}

export const isBackfillPending = (): boolean => existsSync(BACKFILL_PENDING_FILE)

export async function clearBackfillPending(): Promise<void> {
  await rm(BACKFILL_PENDING_FILE, { force: true })
}
