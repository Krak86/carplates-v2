import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema.js'

export type Db = NodePgDatabase<typeof schema>

/**
 * Rebuild the latest-per-plate view. Tries CONCURRENTLY (no read lock) and
 * falls back to a plain refresh, which is needed the first time — a matview
 * created WITH NO DATA cannot be refreshed concurrently until it is populated.
 */
export async function refreshCurrentRegistration(db: Db): Promise<void> {
  try {
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY registry.current_registration`)
  } catch {
    await db.execute(sql`REFRESH MATERIALIZED VIEW registry.current_registration`)
  }
}

export const LOCAL_DATABASE_URL = 'postgres://carplates:carplates@localhost:5432/carplates'

export function resolveDatabaseUrl(explicit?: string): string {
  return explicit ?? process.env.DATABASE_URL ?? LOCAL_DATABASE_URL
}

/** Create a pooled Drizzle client. Caller owns the returned pool's lifetime via `close`. */
export function createDb(url = resolveDatabaseUrl()): { db: Db; pool: Pool; close: () => Promise<void> } {
  const pool = new Pool({ connectionString: url })
  const db = drizzle(pool, { schema })
  return { db, pool, close: () => pool.end() }
}
