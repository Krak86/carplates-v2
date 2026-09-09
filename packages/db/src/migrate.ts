/**
 * Minimal forward-only SQL migrator. Applies every `migrations/*.sql` file in
 * lexical order exactly once, inside a transaction, recording applied names in
 * `registry.__migrations`. Chosen over drizzle-kit's journal/snapshot mechanism
 * because the schema needs hand-written DDL (materialized view with DISTINCT ON,
 * NULLS NOT DISTINCT) that the kit cannot express.
 *
 * `drizzle-kit generate` / `studio` still work for inspection.
 */
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Pool } from 'pg'

import { resolveDatabaseUrl } from './client.js'

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations')

export async function runMigrations(url = resolveDatabaseUrl()): Promise<string[]> {
  const pool = new Pool({ connectionString: url })
  const applied: string[] = []
  try {
    await pool.query('CREATE SCHEMA IF NOT EXISTS registry')
    await pool.query(
      'CREATE TABLE IF NOT EXISTS registry.__migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())'
    )
    const { rows } = await pool.query<{ name: string }>('SELECT name FROM registry.__migrations')
    const done = new Set(rows.map(r => r.name))

    const files = (await readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort()
    for (const file of files) {
      if (done.has(file)) continue
      const sqlText = await readFile(join(migrationsDir, file), 'utf8')
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query(sqlText)
        await client.query('INSERT INTO registry.__migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
        applied.push(file)
      } catch (err) {
        await client.query('ROLLBACK')
        throw new Error(`migration ${file} failed: ${(err as Error).message}`, { cause: err })
      } finally {
        client.release()
      }
    }
    return applied
  } finally {
    await pool.end()
  }
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url)
if (isEntrypoint) {
  runMigrations()
    .then(applied => {
      // eslint-disable-next-line console-rules/no-raw-console -- CLI
      console.log(applied.length ? `applied: ${applied.join(', ')}` : 'up to date')
      process.exit(0)
    })
    .catch((err: unknown) => {
      // eslint-disable-next-line console-rules/no-raw-console -- CLI
      console.error(err)
      process.exit(1)
    })
}
