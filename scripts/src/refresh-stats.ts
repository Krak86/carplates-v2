/**
 * Rebuild `current_registration` and every `stats_by_*` materialized view from
 * whatever's already in `registry.registrations` — no source data is touched.
 *
 *   pnpm db:refresh-stats
 *
 * `ingest`/`ingest:full`/`db:seed` already call this at the end of every run,
 * so it's only needed standalone when you're NOT re-ingesting — most commonly
 * right after `pnpm db:migrate` adds a new `stats_by_*` matview (they're all
 * created `WITH NO DATA`, so a fresh migration leaves the new one empty until
 * something refreshes it) and re-running the full, hours-long `ingest:full`
 * just for that would be wasteful.
 */
import { createDb, refreshCurrentRegistration, refreshStats } from '@carplates/db'

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    await refreshCurrentRegistration(db)
    await refreshStats(db)
    console.log('refreshed current_registration + all stats_by_* materialized views')
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
