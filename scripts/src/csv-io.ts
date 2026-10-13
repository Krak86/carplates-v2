/** Shared CSV(.gz) dump/load for the `--export-csv` / `--from-csv` flags (seed-data/*.csv.gz). */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'

const GZIP_MAGIC_0 = 0x1f
const GZIP_MAGIC_1 = 0x8b

/** Writes `records` as CSV (gzipped when `path` ends in `.gz`); returns the file size in bytes. */
export async function writeCsv(path: string, columns: readonly string[], records: object[]): Promise<number> {
  const csv = stringifyCsv(records, { header: true, columns: [...columns] })
  await mkdir(dirname(path), { recursive: true })
  const output = path.endsWith('.gz') ? gzipSync(csv) : csv
  await writeFile(path, output)
  return output.length
}

/**
 * Reads a CSV (gzipped or plain, auto-detected). Falls back to the `.gz` ⟷ non-`.gz` sibling; returns null when
 * neither exists, so `ingest:ratings:csv` still runs on a clone made before the first export was committed.
 */
export async function readCsv(
  requestedPath: string
): Promise<{ path: string; records: Record<string, string>[] } | null> {
  const alt = requestedPath.endsWith('.gz') ? requestedPath.slice(0, -'.gz'.length) : `${requestedPath}.gz`
  const path = [requestedPath, alt].find(p => existsSync(p))
  if (!path) return null
  const raw = await readFile(path)
  const isGzip = raw[0] === GZIP_MAGIC_0 && raw[1] === GZIP_MAGIC_1
  const content = isGzip ? gunzipSync(raw).toString('utf8') : raw.toString('utf8')
  return { path, records: parseCsv(content, { columns: true, trim: true }) as Record<string, string>[] }
}
