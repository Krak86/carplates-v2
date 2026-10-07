/**
 * Rebuilds every rollup computed from `current_registration`: /fuel, /safety and the /stats "Markets" panel.
 *
 *   pnpm db:refresh-derived
 *
 * Ingests run this themselves (see `derived-refresh.ts`); use it by hand after `db:refresh-stats`, a loaded rating
 * or fuel CSV, or `ingest:vehiclesdb`.
 */
import { refreshDerived } from './derived-refresh.js'

try {
  refreshDerived()
} catch (err) {
  console.error(err)
  process.exit(1)
}
