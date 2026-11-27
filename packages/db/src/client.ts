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

/**
 * Rebuild the registry-statistics rollups (see migrations/0002_stats_rollups.sql).
 * All are a few hundred rows at most — unlike `current_registration`, a plain
 * (non-concurrent, brief-lock) refresh is fine, no CONCURRENTLY fallback needed.
 */
export async function refreshStats(db: Db): Promise<void> {
  await db.execute(sql`REFRESH MATERIALIZED VIEW registry.stats_summary`)
  await db.execute(sql`REFRESH MATERIALIZED VIEW registry.stats_by_year`)
  await db.execute(sql`REFRESH MATERIALIZED VIEW registry.stats_by_month`)
  await db.execute(sql`REFRESH MATERIALIZED VIEW registry.stats_by_region`)
  await db.execute(sql`REFRESH MATERIALIZED VIEW registry.stats_by_region_year`)
  await db.execute(sql`REFRESH MATERIALIZED VIEW registry.stats_by_body`)
  await db.execute(sql`REFRESH MATERIALIZED VIEW registry.stats_by_kind`)
  await db.execute(sql`REFRESH MATERIALIZED VIEW registry.stats_by_color`)
  await db.execute(sql`REFRESH MATERIALIZED VIEW registry.stats_by_fuel`)
  await db.execute(sql`REFRESH MATERIALIZED VIEW registry.stats_by_brand`)
  await db.execute(sql`REFRESH MATERIALIZED VIEW registry.stats_by_brand_year`)
  await db.execute(sql`REFRESH MATERIALIZED VIEW registry.stats_by_model`)
  await db.execute(sql`REFRESH MATERIALIZED VIEW registry.stats_by_origin`)
  await db.execute(sql`REFRESH MATERIALIZED VIEW registry.stats_by_oper`)
  await db.execute(sql`REFRESH MATERIALIZED VIEW registry.stats_data_span`)
}

export const LOCAL_DATABASE_URL = 'postgres://carplates:carplates@localhost:5432/carplates'

export function resolveDatabaseUrl(explicit?: string): string {
  return explicit ?? process.env.DATABASE_URL ?? LOCAL_DATABASE_URL
}

/**
 * Pool and per-session limits (CWE-400). All optional: omitted = driver/server default,
 * so ingest and scripts (long COPY / REFRESH statements) stay unlimited. The API passes
 * its own limits. A timeout of 0 disables that limit.
 */
export type DbLimits = {
  max?: number
  connectionTimeoutMillis?: number
  idleTimeoutMillis?: number
  /** Postgres `statement_timeout`, ms. */
  statementTimeoutMs?: number
  /** Postgres `idle_in_transaction_session_timeout`, ms. */
  idleInTransactionTimeoutMs?: number
  /** Postgres `lock_timeout`, ms. */
  lockTimeoutMs?: number
}

/** Build the libpq `options` string; undefined when no server-side limit is set. */
export function buildPgOptions(limits: DbLimits): string | undefined {
  const parts: string[] = []
  if (limits.statementTimeoutMs !== undefined) parts.push(`-c statement_timeout=${limits.statementTimeoutMs}`)
  if (limits.idleInTransactionTimeoutMs !== undefined)
    parts.push(`-c idle_in_transaction_session_timeout=${limits.idleInTransactionTimeoutMs}`)
  if (limits.lockTimeoutMs !== undefined) parts.push(`-c lock_timeout=${limits.lockTimeoutMs}`)
  return parts.length > 0 ? parts.join(' ') : undefined
}

/** Create a pooled Drizzle client. Caller owns the returned pool's lifetime via `close`. */
export function createDb(
  url = resolveDatabaseUrl(),
  limits: DbLimits = {}
): { db: Db; pool: Pool; close: () => Promise<void> } {
  const pool = new Pool({
    connectionString: url,
    max: limits.max,
    connectionTimeoutMillis: limits.connectionTimeoutMillis,
    idleTimeoutMillis: limits.idleTimeoutMillis,
    options: buildPgOptions(limits)
  })
  const db = drizzle(pool, { schema })
  return { db, pool, close: () => pool.end() }
}
