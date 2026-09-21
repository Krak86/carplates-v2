/**
 * Single-command full local ingest: every CKAN year, the archived pre-redaction
 * 2026 snapshot, then plate backfill. Equivalent to running these three
 * `pnpm ingest` invocations in order:
 *
 *   pnpm ingest
 *   pnpm ingest --file .data/archive/reestrTZ2026_pre-redaction_2026-05-01.zip
 *   pnpm ingest --backfill-plates
 *
 * The middle step downloads its source fresh each time rather than shipping
 * the ZIP in the repo: the live reestrTZ2026 CKAN resource lost its plate
 * column sometime before the ГСЦ МВС order's 2026-06-29 effective date and
 * data.gov.ua replaces resources in place, so the pre-redaction data is only
 * reachable via this one specific revision-history URL — not the documented
 * CKAN API, and not guaranteed to stay up (it has already 502'd once). If the
 * download fails and no cached copy exists locally, this step logs a warning
 * and the run continues without 2026 plate recovery rather than failing.
 * See PLAN.md, "2026 plate removal".
 */
import { createWriteStream, existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const SCRIPTS_DIR = join(import.meta.dirname, '..')
const ARCHIVE_2026 = join(SCRIPTS_DIR, '.data', 'archive', 'reestrTZ2026_pre-redaction_2026-05-01.zip')
const ARCHIVE_2026_URL =
  'https://data.gov.ua/dataset/0ffd8b75-0628-48cc-952a-9302f9799ec0/resource/3f13166f-090b-499e-8e23-e9851c5a5f67/revision/508698/download'

function runIngest(args: string[]): void {
  const result = spawnSync('tsx', ['src/ingest.ts', ...args], { cwd: SCRIPTS_DIR, stdio: 'inherit', shell: true })
  if (result.status !== 0) throw new Error(`pnpm ingest ${args.join(' ')} failed (exit ${String(result.status)})`)
}

async function ensureArchive2026(): Promise<boolean> {
  if (existsSync(ARCHIVE_2026)) return true
  console.log(`downloading pre-redaction 2026 snapshot from ${ARCHIVE_2026_URL} …`)
  try {
    const res = await fetch(ARCHIVE_2026_URL)
    if (!res.ok || !res.body) throw new Error(`HTTP ${String(res.status)}`)
    await mkdir(join(SCRIPTS_DIR, '.data', 'archive'), { recursive: true })
    await pipeline(Readable.fromWeb(res.body), createWriteStream(ARCHIVE_2026))
    console.log('done: downloaded pre-redaction 2026 snapshot')
    return true
  } catch (err) {
    console.warn(
      `warn: could not download the pre-redaction 2026 snapshot (${err instanceof Error ? err.message : String(err)}).\n` +
        '      Skipping 2026 plate recovery for this run — that URL is an undocumented data.gov.ua ' +
        'revision link, not the CKAN API, and can go down (see PLAN.md, "2026 plate removal").'
    )
    return false
  }
}

async function main(): Promise<void> {
  runIngest([])
  if (await ensureArchive2026()) runIngest(['--file', ARCHIVE_2026])
  runIngest(['--backfill-plates'])
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
