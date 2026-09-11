import { sql } from 'drizzle-orm'
import type { Db } from '@carplates/db'

export interface BackfillResult {
  exactMatched: number
  vinFallback: number
  deduped: number
}

/**
 * Reconstruct `plate` for rows the 2026 layout published without one (ГСЦ МВС
 * order №67/ОД, 2026-06-29). Two passes, most authoritative first:
 *
 *   1. Exact event match — the same (vin, d_reg, oper_code) already exists on a
 *      plated row. Restricted to unambiguous matches (a handful of keys collide
 *      across different plates and are left alone rather than guessed).
 *   2. VIN fallback — the most recent plated row for that VIN, regardless of
 *      event. Marked `plate_inferred`: the vehicle may have been re-plated since.
 *
 * Indexes are dropped/recreated around the updates: an in-place UPDATE moving a
 * row from the plate-IS-NULL partial index to the plate-IS-NOT-NULL one can
 * collide with a row already there for the same file being ingested twice, and
 * PostgreSQL checks unique indexes per-row inside one UPDATE.
 *
 * Re-runnable — safe to call again after every ingest, including after a
 * rollback of №67/ОД re-populates plates directly.
 */
export async function backfillPlates(db: Db): Promise<BackfillResult> {
  return db.transaction(async tx => {
    await tx.execute(sql`DROP INDEX registry.ux_reg_dedupe`)
    await tx.execute(sql`DROP INDEX registry.ux_reg_dedupe_vin`)

    const exact = await tx.execute(sql`
      WITH matches AS (
        SELECT np.id AS np_id, p.plate AS plate
        FROM registry.registrations np
        JOIN registry.registrations p
          ON p.vin = np.vin
         AND p.d_reg IS NOT DISTINCT FROM np.d_reg
         AND p.oper_code IS NOT DISTINCT FROM np.oper_code
         AND p.plate IS NOT NULL
        WHERE np.plate IS NULL AND np.vin IS NOT NULL
      ),
      unambiguous AS (
        SELECT np_id, min(plate) AS plate
        FROM matches
        GROUP BY np_id
        HAVING count(DISTINCT plate) = 1
      )
      UPDATE registry.registrations r
      SET plate = u.plate, plate_inferred = false
      FROM unambiguous u
      WHERE r.id = u.np_id
    `)

    const vinFallback = await tx.execute(sql`
      WITH latest_by_vin AS (
        SELECT DISTINCT ON (vin) vin, plate
        FROM registry.registrations
        WHERE plate IS NOT NULL AND vin IS NOT NULL
        ORDER BY vin, d_reg DESC NULLS LAST, id DESC
      )
      UPDATE registry.registrations r
      SET plate = lv.plate, plate_inferred = true
      FROM latest_by_vin lv
      WHERE r.plate IS NULL AND r.vin = lv.vin
    `)

    // Backfilling can produce an exact duplicate of a row already present
    // (e.g. the same event ingested both plated and plateless). Keep the
    // authoritative (non-inferred) copy, lowest id as the tiebreak.
    const deduped = await tx.execute(sql`
      WITH ranked AS (
        SELECT id,
          row_number() OVER (
            PARTITION BY plate, d_reg, oper_code, vin
            ORDER BY plate_inferred ASC, id ASC
          ) AS rn
        FROM registry.registrations
        WHERE plate IS NOT NULL
      )
      DELETE FROM registry.registrations r
      USING ranked
      WHERE r.id = ranked.id AND ranked.rn > 1
    `)

    await tx.execute(sql`
      CREATE UNIQUE INDEX ux_reg_dedupe ON registry.registrations
        (plate, d_reg, oper_code, vin) NULLS NOT DISTINCT WHERE plate IS NOT NULL
    `)
    await tx.execute(sql`
      CREATE UNIQUE INDEX ux_reg_dedupe_vin ON registry.registrations
        (vin, d_reg, oper_code) NULLS NOT DISTINCT WHERE plate IS NULL
    `)

    return {
      exactMatched: exact.rowCount ?? 0,
      vinFallback: vinFallback.rowCount ?? 0,
      deduped: deduped.rowCount ?? 0
    }
  })
}
