/**
 * Loads VIN world-manufacturer identifiers (first 3 VIN characters) from NHTSA's vPIC API into `registry.wmi_prefix`: maker, country,
 * region. vPIC has no bulk WMI endpoint, so this lists every manufacturer (paged), keeps road-vehicle makers and asks for each one's
 * WMIs. ~2.7k calls, cached per call in scripts/.data/wmi/ (gitignored), so an interrupted run resumes and a re-run is instant.
 * `packages/shared/src/wmi.ts` stays the fallback until the table is wired into the API.
 *
 *   pnpm ingest:wmi                 # query (cached), upsert
 *   pnpm ingest:wmi --dry-run       # query + report, write nothing
 *   pnpm ingest:wmi --refresh       # ignore the cache
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { createDb, wmiPrefix } from '@carplates/db'
import { sql } from 'drizzle-orm'

import {
  buildWmiRows,
  countryNameToCode,
  isWantedManufacturer,
  manufacturersPageSchema,
  wmiListSchema
} from './wmi-parse.js'
import type { NhtsaManufacturer } from './wmi-parse.js'

const BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'wmi')
const CONCURRENCY = 2
const PAUSE_MS = 300
const RETRIES = 4
const TIMEOUT_MS = 60_000

const log = (...m: unknown[]): void => {
  console.log(...m)
}
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

class BlockedError extends Error {
  constructor(status: number) {
    super(`NHTSA answered ${status}: this IP is throttled, retry in an hour or so`)
  }
}

async function getJson(url: string): Promise<unknown> {
  let lastError: unknown
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (res.ok) {
        await sleep(PAUSE_MS)
        return await res.json()
      }
      // 403 / 429 = NHTSA throttling this IP: retrying only prolongs it. Stop and resume later (the cache keeps what was fetched).
      if (res.status === 403 || res.status === 429) throw new BlockedError(res.status)
      lastError = new Error(`NHTSA ${res.status} for ${url}`)
    } catch (err) {
      if (err instanceof BlockedError) throw err
      lastError = err
    }
    await sleep(attempt * 3000)
  }
  throw lastError
}

async function cached<T>(name: string, refresh: boolean, load: () => Promise<T>): Promise<T> {
  const path = join(DATA_DIR, `${name}.json`)
  if (!refresh && existsSync(path)) return JSON.parse(await readFile(path, 'utf8')) as T
  const value = await load()
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(path, JSON.stringify(value))
  return value
}

async function listManufacturers(refresh: boolean): Promise<NhtsaManufacturer[]> {
  const all: NhtsaManufacturer[] = []
  for (let page = 1; page < 1000; page++) {
    const results = await cached(
      `mfrs-${page}`,
      refresh,
      async () =>
        manufacturersPageSchema.parse(await getJson(`${BASE}/GetAllManufacturers?format=json&page=${page}`)).Results
    )
    if (results.length === 0) break
    all.push(...results)
  }
  return all
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const refresh = argv.includes('--refresh')

  const manufacturers = (await listManufacturers(refresh)).filter(isWantedManufacturer)
  log(`${manufacturers.length} road-vehicle manufacturer(s)`)

  const entries: { manufacturer: NhtsaManufacturer; wmis: string[] }[] = []
  const failed: number[] = []
  let next = 0
  let done = 0
  let blocked = false
  const worker = async (): Promise<void> => {
    while (next < manufacturers.length && !blocked) {
      const manufacturer = manufacturers[next++]!
      try {
        const wmis = await cached(`wmi-${manufacturer.Mfr_ID}`, refresh, async () =>
          wmiListSchema
            .parse(await getJson(`${BASE}/GetWMIsForManufacturer/${manufacturer.Mfr_ID}?format=json`))
            .Results.map(r => r.WMI ?? '')
            .filter(Boolean)
        )
        entries.push({ manufacturer, wmis })
      } catch (err) {
        if (err instanceof BlockedError) blocked = true
        failed.push(manufacturer.Mfr_ID)
      }
      if (++done % 200 === 0) log(`  ${done}/${manufacturers.length}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  if (failed.length)
    log(
      `FAILED ${failed.length} manufacturer(s) - re-run to retry only these (the rest is cached): ${failed.join(', ')}`
    )

  const rows = buildWmiRows(entries)
  const noCountry = rows.filter(r => !r.countryCode)
  const unknownNames = new Set(
    entries
      .filter(e => !countryNameToCode(e.manufacturer.Country) && e.manufacturer.Country?.trim())
      .map(e => e.manufacturer.Country!.trim())
  )
  log(
    `${rows.length} WMI(s); ${noCountry.length} without a country${unknownNames.size ? ` (unrecognised: ${[...unknownNames].join(', ')})` : ''}`
  )

  if (dryRun) {
    log('dry-run: nothing written')
    return
  }
  const { db, close } = createDb()
  try {
    for (let i = 0; i < rows.length; i += 1000) {
      await db
        .insert(wmiPrefix)
        .values(rows.slice(i, i + 1000))
        .onConflictDoUpdate({
          target: [wmiPrefix.wmi, wmiPrefix.fromYear],
          set: {
            maker: sql`excluded.maker`,
            countryCode: sql`excluded.country_code`,
            region: sql`excluded.region`,
            updatedAt: new Date()
          }
        })
    }
    log(`upserted ${rows.length} WMI(s)`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
