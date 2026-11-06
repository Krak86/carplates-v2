/**
 * Loads DREAM recovery projects (dream.gov.ua public API, Open Contracting Data Standard, no key) into `registry.dream_projects`.
 * The list endpoint returns ids + last update (up to 1000 per call), the details need one call per project, so by default only
 * projects changed since the newest stored `updated_at` are fetched (a daily run is a few hundred calls); `--full` reloads all
 * (~16,000 calls, about 15 minutes). Upsert by id, safe to repeat.
 *
 *   pnpm ingest:dream              # incremental
 *   pnpm ingest:dream --full       # every project
 *   pnpm ingest:dream --dry-run    # fetch and print, write nothing
 */
import { createDb, dreamProjects } from '@carplates/db'
import type { DreamProjectInsert } from '@carplates/db'
import { DREAM_SOURCE_URL, dreamIdeaSchema, dreamListSchema, ideaToRow } from '@carplates/shared'
import { sql } from 'drizzle-orm'

const TIMEOUT_MS = 30_000
const CONCURRENCY = 5
const BATCH = 500
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function getJson(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json', 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })
      if (!res.ok) throw new Error(`upstream status ${res.status}`)
      return await res.json()
    } catch (err) {
      if (attempt >= 3) throw err
      await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }
}

/** Ids changed since `from` (ISO) or all of them, oldest first. */
async function listIds(from: string | null): Promise<string[]> {
  const ids = new Map<string, string>()
  let cursor = from
  for (let page = 0; page < 200; page++) {
    const url = `${DREAM_SOURCE_URL}/ideas?order=asc${cursor ? `&from=${encodeURIComponent(cursor)}` : ''}`
    const { data } = dreamListSchema.parse(await getJson(url))
    if (data.length === 0) break
    let added = 0
    for (const item of data) {
      if (!ids.has(item.internal.id)) added++
      ids.set(item.internal.id, item.external.updated)
    }
    log(`list page ${page + 1}: ${data.length} item(s), ${ids.size} id(s) so far`)
    const last = data[data.length - 1]?.external.updated ?? null
    if (added === 0 || last === cursor || data.length < 1000) break
    cursor = last
  }
  return [...ids.keys()]
}

async function fetchRows(ids: string[]): Promise<DreamProjectInsert[]> {
  const rows: DreamProjectInsert[] = []
  let next = 0
  let failed = 0
  const worker = async (): Promise<void> => {
    for (let i = next++; i < ids.length; i = next++) {
      try {
        const idea = dreamIdeaSchema.parse(await getJson(`${DREAM_SOURCE_URL}/ideas/${ids[i]}`))
        rows.push(ideaToRow(idea))
      } catch (err) {
        failed++
        console.warn(`skip ${ids[i]}: ${err instanceof Error ? err.message : String(err)}`)
      }
      if ((i + 1) % 500 === 0) log(`${i + 1}/${ids.length} project(s) fetched`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  if (failed > 0) log(`${failed} project(s) skipped (see warnings above); the next run retries them`)
  return rows
}

async function main(): Promise<void> {
  const full = process.argv.includes('--full')
  const dry = process.argv.includes('--dry-run')
  const { db, close } = createDb()
  try {
    let from: string | null = null
    if (!full) {
      const [latest] = await db.select({ max: sql<string | null>`max(${dreamProjects.updatedAt})` }).from(dreamProjects)
      from = latest?.max ? new Date(latest.max).toISOString() : null
    }
    log(from ? `incremental since ${from}` : 'full load')
    const ids = await listIds(from)
    if (ids.length === 0) {
      log('nothing new')
      return
    }
    const rows = await fetchRows(ids)
    if (rows.length === 0) throw new Error('no project could be read: nothing to write')
    log(
      `${rows.length} project row(s); statuses`,
      Object.fromEntries(rows.map(r => r.status).map(s => [s, rows.filter(r => r.status === s).length]))
    )
    if (dry) {
      log('dry-run: nothing written')
      return
    }
    for (let i = 0; i < rows.length; i += BATCH) {
      await db
        .insert(dreamProjects)
        .values(rows.slice(i, i + BATCH))
        .onConflictDoUpdate({
          target: dreamProjects.id,
          set: {
            code: sql`excluded.code`,
            status: sql`excluded.status`,
            projectType: sql`excluded.project_type`,
            purpose: sql`excluded.purpose`,
            title: sql`excluded.title`,
            oblastCode: sql`excluded.oblast_code`,
            committedUah: sql`excluded.committed_uah`,
            updatedAt: sql`excluded.updated_at`,
            fetchedAt: sql`now()`
          }
        })
    }
    log(`upserted ${rows.length} project row(s) into registry.dream_projects`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
