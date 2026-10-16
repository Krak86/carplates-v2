/**
 * Seed-CSV dump/load of the stolen.in.ua wanted history (`source = 'stolen.in.ua'` rows + the scrape resume ids), so a new
 * setup loads it instead of re-scraping ~8 h. Cumulative snapshot: re-export after every backfill step (WANTED_PLAN.md).
 *
 *   pnpm export:wanted-history:csv   # -> seed-data/wanted-history.csv.gz + wanted-history-ids.csv.gz
 *   pnpm ingest:wanted-history:csv   # load them (insert-only, safe to repeat)
 */
import { createDb, wantedScrapeIds, wantedScrapePages, wantedVehicles } from '@carplates/db'
import type { Db } from '@carplates/db'
import { eq } from 'drizzle-orm'

import { readCsv, writeCsv } from './csv-io.js'

const VEHICLES_PATH = 'seed-data/wanted-history.csv.gz'
const IDS_PATH = 'seed-data/wanted-history-ids.csv.gz'
const PAGES_PATH = 'seed-data/wanted-history-pages.csv.gz'
const BATCH = 1000

const VEHICLE_COLUMNS = [
  'source_id',
  'plate',
  'vin',
  'vin_alt',
  'brand',
  'model',
  'vehicle_type',
  'color',
  'seized_at',
  'registered_at',
  'organ_unit',
  'first_seen_at',
  'last_seen_at',
  'resolved_at',
  'resolved_exact',
  'region'
] as const

const ID_COLUMNS = ['ident', 'status', 'fetched_at'] as const
const PAGE_COLUMNS = ['month', 'fetched_at', 'cards'] as const

const iso = (d: Date | null) => d?.toISOString() ?? ''
const orNull = (s: string | undefined) => (s ? s : null)

async function exportCsv(db: Db): Promise<void> {
  const rows = await db.select().from(wantedVehicles).where(eq(wantedVehicles.source, 'stolen.in.ua'))
  const size = await writeCsv(
    VEHICLES_PATH,
    VEHICLE_COLUMNS,
    rows.map(r => ({
      source_id: r.sourceId,
      plate: r.plate ?? '',
      vin: r.vin ?? '',
      vin_alt: r.vinAlt ?? '',
      brand: r.brand ?? '',
      model: r.model ?? '',
      vehicle_type: r.vehicleType ?? '',
      color: r.color ?? '',
      seized_at: r.seizedAt ?? '',
      registered_at: r.registeredAt ?? '',
      organ_unit: r.organUnit ?? '',
      first_seen_at: iso(r.firstSeenAt),
      last_seen_at: iso(r.lastSeenAt),
      resolved_at: iso(r.resolvedAt),
      resolved_exact: String(r.resolvedExact),
      region: r.region ?? ''
    }))
  )
  console.log(`${rows.length} vehicle row(s) -> ${VEHICLES_PATH} (${size} B)`)

  const ids = await db.select().from(wantedScrapeIds)
  const idsSize = await writeCsv(
    IDS_PATH,
    ID_COLUMNS,
    ids.map(r => ({ ident: r.ident, status: r.status, fetched_at: iso(r.fetchedAt) }))
  )
  console.log(`${ids.length} scrape id(s) -> ${IDS_PATH} (${idsSize} B)`)

  const pages = await db.select().from(wantedScrapePages)
  const pagesSize = await writeCsv(
    PAGES_PATH,
    PAGE_COLUMNS,
    pages.map(r => ({ month: r.month, fetched_at: iso(r.fetchedAt), cards: r.cards }))
  )
  console.log(`${pages.length} scrape page(s) -> ${PAGES_PATH} (${pagesSize} B)`)
}

async function insertBatches<T extends object>(rows: T[], insert: (batch: T[]) => Promise<void>): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) await insert(rows.slice(i, i + BATCH))
}

async function importCsv(db: Db): Promise<void> {
  const vehicles = await readCsv(VEHICLES_PATH)
  if (!vehicles) {
    console.log(`no ${VEHICLES_PATH} yet - skipped (run ingest:wanted-history, then export:wanted-history:csv)`)
    return
  }
  await insertBatches(vehicles.records, batch =>
    db
      .insert(wantedVehicles)
      .values(
        batch.map(r => ({
          sourceId: r.source_id!,
          plate: orNull(r.plate),
          vin: orNull(r.vin),
          vinAlt: orNull(r.vin_alt),
          brand: orNull(r.brand),
          model: orNull(r.model),
          vehicleType: orNull(r.vehicle_type),
          color: orNull(r.color),
          seizedAt: orNull(r.seized_at),
          registeredAt: orNull(r.registered_at),
          organUnit: orNull(r.organ_unit),
          firstSeenAt: new Date(r.first_seen_at!),
          lastSeenAt: new Date(r.last_seen_at!),
          resolvedAt: r.resolved_at ? new Date(r.resolved_at) : null,
          source: 'stolen.in.ua',
          resolvedExact: r.resolved_exact === 'true',
          region: orNull(r.region)
        }))
      )
      .onConflictDoNothing()
      .then(() => undefined)
  )
  console.log(`${vehicles.records.length} vehicle row(s) loaded from ${vehicles.path}`)

  const ids = await readCsv(IDS_PATH)
  if (ids) {
    await insertBatches(ids.records, batch =>
      db
        .insert(wantedScrapeIds)
        .values(batch.map(r => ({ ident: r.ident!, status: r.status!, fetchedAt: new Date(r.fetched_at!) })))
        .onConflictDoNothing()
        .then(() => undefined)
    )
    console.log(`${ids.records.length} scrape id(s) loaded`)
  }

  const pages = await readCsv(PAGES_PATH)
  if (pages) {
    await insertBatches(pages.records, batch =>
      db
        .insert(wantedScrapePages)
        .values(batch.map(r => ({ month: r.month!, fetchedAt: new Date(r.fetched_at!), cards: Number(r.cards) })))
        .onConflictDoNothing()
        .then(() => undefined)
    )
    console.log(`${pages.records.length} scrape page(s) loaded`)
  }
}

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    if (process.argv.includes('--export-csv')) await exportCsv(db)
    else await importCsv(db)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
