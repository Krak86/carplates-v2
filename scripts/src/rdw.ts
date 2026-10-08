/**
 * Loads RDW (Dutch vehicle authority) specs into `registry.rdw_specs`: power, displacement, unladen and gross mass,
 * combined CO2, wheelbase, seats, doors, towing, dimensions, top speed, new list price, cylinders, consumption, EV range and
 * noise as min / median / max per make/model/year, plus fuel mix, colours, body types, energy labels and the open-recall share. CC0 data from opendata.rdw.nl, aggregated by RDW's own SODA server
 * (a join of "Gekentekende voertuigen" m9d7-ebf2 and its fuel/emissions dataset 8ys7-d773 on kenteken) — never the
 * ~17M raw rows. One query per make, cached on disk in scripts/.data/rdw/ (gitignored).
 *
 *   pnpm ingest:rdw                          # every make with >= 50 vehicles, ~1 h cold, resumable from the cache
 *   pnpm ingest:rdw -- --make SKODA          # just one make (RDW spelling)
 *   pnpm ingest:rdw -- --min-vehicles 500    # bigger makes only
 *   pnpm ingest:rdw -- --dry-run             # query + count, write nothing
 *   pnpm ingest:rdw -- --refresh             # re-query even if cached
 *   pnpm ingest:rdw -- --export-csv ./x.csv[.gz]   # dump the current table
 *   pnpm ingest:rdw -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no download
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { RDW_MIN_N } from '@carplates/shared'
import { createDb, rdwSpecs } from '@carplates/db'
import type { Db, RdwSpecsInsert, RdwSpecsRow, RdwTally } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import { sql } from 'drizzle-orm'

import { dedupeByKey, makesQuery, MIN_YEAR, parseSpecsRecord, specsQuery } from './rdw-parse.js'

const QUERY_URL = 'https://opendata.rdw.nl/api/v3/views/m9d7-ebf2/query.json'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'rdw')
// 114 columns per row: 500 rows stay under the 65,535 bind-parameter limit.
const BATCH = 500
const DEFAULT_MIN_VEHICLES = 50
const QUERY_TIMEOUT_MS = 280_000
const RETRIES = 3

type Args = {
  dryRun: boolean
  refresh: boolean
  make?: string
  minVehicles: number
  exportCsv?: string
  fromCsv?: string
}

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false, refresh: false, minVehicles: DEFAULT_MIN_VEHICLES }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--refresh') a.refresh = true
    else if (arg === '--make') a.make = argv[++i]
    else if (arg === '--min-vehicles') a.minVehicles = Number(argv[++i]) || DEFAULT_MIN_VEHICLES
    else if (arg === '--export-csv') a.exportCsv = argv[++i]
    else if (arg === '--from-csv') a.fromCsv = argv[++i]
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/** SoQL over POST (the grouped query is too long for a URL), retried with a growing pause on 429/5xx/timeouts. */
async function soql(query: string): Promise<Record<string, unknown>[]> {
  let lastError: unknown
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(QUERY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'User-Agent': USER_AGENT },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(QUERY_TIMEOUT_MS)
      })
      if (res.ok) return (await res.json()) as Record<string, unknown>[]
      const body = (await res.text()).slice(0, 300)
      // A malformed query will not heal by retrying.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) throw new Error(`RDW ${res.status}: ${body}`)
      lastError = new Error(`RDW ${res.status}: ${body}`)
    } catch (err) {
      lastError = err
      if (err instanceof Error && err.message.startsWith('RDW 4') && !err.message.startsWith('RDW 429')) throw err
    }
    await sleep(attempt * 5000)
  }
  throw lastError
}

const cachePath = (name: string): string => join(DATA_DIR, `${name.replace(/[^A-Za-z0-9]+/g, '_')}.json`)

async function cached<T>(name: string, refresh: boolean, load: () => Promise<T>): Promise<T> {
  const path = cachePath(name)
  if (!refresh && existsSync(path)) return JSON.parse(await readFile(path, 'utf8')) as T
  const value = await load()
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(path, JSON.stringify(value))
  return value
}

/** A whole make in one query; if RDW times out on a giant make (Volkswagen, Toyota …), one query per year instead. */
async function fetchMake(make: string, maxYear: number): Promise<Record<string, unknown>[]> {
  try {
    return await soql(specsQuery(make))
  } catch (err) {
    log(`  ${make}: whole-make query failed (${String(err).slice(0, 120)}) — retrying per year`)
    const out: Record<string, unknown>[] = []
    for (let year = MIN_YEAR; year <= maxYear; year++) out.push(...(await soql(specsQuery(make, year))))
    return out
  }
}

async function upsertAll(db: Db, rows: RdwSpecsInsert[]): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(rdwSpecs)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: [rdwSpecs.kind, rdwSpecs.makeKey, rdwSpecs.modelKey, rdwSpecs.modelYear],
        set: {
          make: sql`excluded.make`,
          model: sql`excluded.model`,
          n: sql`excluded.n`,
          powerKwMin: sql`excluded.power_kw_min`,
          powerKwMedian: sql`excluded.power_kw_median`,
          powerKwMax: sql`excluded.power_kw_max`,
          displacementCcMin: sql`excluded.displacement_cc_min`,
          displacementCcMedian: sql`excluded.displacement_cc_median`,
          displacementCcMax: sql`excluded.displacement_cc_max`,
          massKgMin: sql`excluded.mass_kg_min`,
          massKgMedian: sql`excluded.mass_kg_median`,
          massKgMax: sql`excluded.mass_kg_max`,
          co2GKmMin: sql`excluded.co2_g_km_min`,
          co2GKmMedian: sql`excluded.co2_g_km_median`,
          co2GKmMax: sql`excluded.co2_g_km_max`,
          grossMassKgMin: sql`excluded.gross_mass_kg_min`,
          grossMassKgMedian: sql`excluded.gross_mass_kg_median`,
          grossMassKgMax: sql`excluded.gross_mass_kg_max`,
          wheelbaseCmMin: sql`excluded.wheelbase_cm_min`,
          wheelbaseCmMedian: sql`excluded.wheelbase_cm_median`,
          wheelbaseCmMax: sql`excluded.wheelbase_cm_max`,
          seatsMin: sql`excluded.seats_min`,
          seatsMedian: sql`excluded.seats_median`,
          seatsMax: sql`excluded.seats_max`,
          doorsMin: sql`excluded.doors_min`,
          doorsMedian: sql`excluded.doors_median`,
          doorsMax: sql`excluded.doors_max`,
          towBrakedKgMin: sql`excluded.tow_braked_kg_min`,
          towBrakedKgMedian: sql`excluded.tow_braked_kg_median`,
          towBrakedKgMax: sql`excluded.tow_braked_kg_max`,
          towUnbrakedKgMin: sql`excluded.tow_unbraked_kg_min`,
          towUnbrakedKgMedian: sql`excluded.tow_unbraked_kg_median`,
          towUnbrakedKgMax: sql`excluded.tow_unbraked_kg_max`,
          lengthCmMin: sql`excluded.length_cm_min`,
          lengthCmMedian: sql`excluded.length_cm_median`,
          lengthCmMax: sql`excluded.length_cm_max`,
          lengthCmN: sql`excluded.length_cm_n`,
          widthCmMin: sql`excluded.width_cm_min`,
          widthCmMedian: sql`excluded.width_cm_median`,
          widthCmMax: sql`excluded.width_cm_max`,
          widthCmN: sql`excluded.width_cm_n`,
          heightCmMin: sql`excluded.height_cm_min`,
          heightCmMedian: sql`excluded.height_cm_median`,
          heightCmMax: sql`excluded.height_cm_max`,
          heightCmN: sql`excluded.height_cm_n`,
          topSpeedKmhMin: sql`excluded.top_speed_kmh_min`,
          topSpeedKmhMedian: sql`excluded.top_speed_kmh_median`,
          topSpeedKmhMax: sql`excluded.top_speed_kmh_max`,
          topSpeedKmhN: sql`excluded.top_speed_kmh_n`,
          priceEurMin: sql`excluded.price_eur_min`,
          priceEurMedian: sql`excluded.price_eur_median`,
          priceEurMax: sql`excluded.price_eur_max`,
          priceEurN: sql`excluded.price_eur_n`,
          priceExTaxEurMin: sql`excluded.price_ex_tax_eur_min`,
          priceExTaxEurMedian: sql`excluded.price_ex_tax_eur_median`,
          priceExTaxEurMax: sql`excluded.price_ex_tax_eur_max`,
          bpmEurMin: sql`excluded.bpm_eur_min`,
          bpmEurMedian: sql`excluded.bpm_eur_median`,
          bpmEurMax: sql`excluded.bpm_eur_max`,
          bpmEurN: sql`excluded.bpm_eur_n`,
          kerbMassKgMin: sql`excluded.kerb_mass_kg_min`,
          kerbMassKgMedian: sql`excluded.kerb_mass_kg_median`,
          kerbMassKgMax: sql`excluded.kerb_mass_kg_max`,
          cylindersMin: sql`excluded.cylinders_min`,
          cylindersMedian: sql`excluded.cylinders_median`,
          cylindersMax: sql`excluded.cylinders_max`,
          cylindersN: sql`excluded.cylinders_n`,
          consumptionL100Min: sql`excluded.consumption_l100_min`,
          consumptionL100Median: sql`excluded.consumption_l100_median`,
          consumptionL100Max: sql`excluded.consumption_l100_max`,
          consumptionL100N: sql`excluded.consumption_l100_n`,
          evKwh100Min: sql`excluded.ev_kwh100_min`,
          evKwh100Median: sql`excluded.ev_kwh100_median`,
          evKwh100Max: sql`excluded.ev_kwh100_max`,
          evKwh100N: sql`excluded.ev_kwh100_n`,
          evRangeKmMin: sql`excluded.ev_range_km_min`,
          evRangeKmMedian: sql`excluded.ev_range_km_median`,
          evRangeKmMax: sql`excluded.ev_range_km_max`,
          evRangeKmN: sql`excluded.ev_range_km_n`,
          noiseDbMin: sql`excluded.noise_db_min`,
          noiseDbMedian: sql`excluded.noise_db_median`,
          noiseDbMax: sql`excluded.noise_db_max`,
          noiseDbN: sql`excluded.noise_db_n`,
          fuelMix: sql`excluded.fuel_mix`,
          fuelMixN: sql`excluded.fuel_mix_n`,
          colours: sql`excluded.colours`,
          coloursN: sql`excluded.colours_n`,
          bodyTypes: sql`excluded.body_types`,
          bodyTypesN: sql`excluded.body_types_n`,
          energyLabels: sql`excluded.energy_labels`,
          energyLabelsN: sql`excluded.energy_labels_n`,
          recallOpenN: sql`excluded.recall_open_n`,
          recallN: sql`excluded.recall_n`,
          scrapedAt: new Date()
        }
      })
  }
}

async function download(args: Args): Promise<RdwSpecsInsert[]> {
  const maxYear = new Date().getFullYear() + 1
  const makes = args.make
    ? [args.make]
    : (await cached(`makes-${args.minVehicles}`, args.refresh, () => soql(makesQuery(args.minVehicles)))).map(r =>
        String(r.merk)
      )
  log(`${makes.length} make(s) to aggregate`)

  const rows: RdwSpecsInsert[] = []
  const failed: string[] = []
  const run = async (list: string[], label: string): Promise<void> => {
    let i = 0
    for (const make of list) {
      i++
      try {
        const records = await cached(`make-${make}`, args.refresh, () => fetchMake(make, maxYear))
        const parsed = records
          .map(rec => parseSpecsRecord(make, rec, RDW_MIN_N, maxYear))
          .filter((r): r is RdwSpecsInsert => r !== null)
        rows.push(...parsed)
        log(`[${label} ${i}/${list.length}] ${make}: ${records.length} group(s) → ${parsed.length} row(s)`)
      } catch (err) {
        // A make that RDW can't answer must not stop the run; it is retried once at the end and listed if still failing.
        failed.push(make)
        log(`[${label} ${i}/${list.length}] ${make}: FAILED ${String(err).slice(0, 160)}`)
      }
    }
  }

  await run(makes, 'make')
  if (failed.length > 0) {
    const retry = failed.splice(0)
    log(`retrying ${retry.length} failed make(s) …`)
    await run(retry, 'retry')
  }
  if (failed.length > 0) {
    log(
      `STILL FAILED (${failed.length}) — re-run pnpm ingest:rdw to retry only these (the rest is cached): ${failed.join(', ')}`
    )
  }
  return dedupeByKey(rows)
}

const CSV_COLUMNS = [
  'kind',
  'make',
  'model',
  'make_key',
  'model_key',
  'model_year',
  'n',
  'power_kw_min',
  'power_kw_median',
  'power_kw_max',
  'displacement_cc_min',
  'displacement_cc_median',
  'displacement_cc_max',
  'mass_kg_min',
  'mass_kg_median',
  'mass_kg_max',
  'co2_g_km_min',
  'co2_g_km_median',
  'co2_g_km_max',
  'gross_mass_kg_min',
  'gross_mass_kg_median',
  'gross_mass_kg_max',
  'wheelbase_cm_min',
  'wheelbase_cm_median',
  'wheelbase_cm_max',
  'seats_min',
  'seats_median',
  'seats_max',
  'doors_min',
  'doors_median',
  'doors_max',
  'tow_braked_kg_min',
  'tow_braked_kg_median',
  'tow_braked_kg_max',
  'tow_unbraked_kg_min',
  'tow_unbraked_kg_median',
  'tow_unbraked_kg_max',
  'length_cm_min',
  'length_cm_median',
  'length_cm_max',
  'length_cm_n',
  'width_cm_min',
  'width_cm_median',
  'width_cm_max',
  'width_cm_n',
  'height_cm_min',
  'height_cm_median',
  'height_cm_max',
  'height_cm_n',
  'top_speed_kmh_min',
  'top_speed_kmh_median',
  'top_speed_kmh_max',
  'top_speed_kmh_n',
  'price_eur_min',
  'price_eur_median',
  'price_eur_max',
  'price_eur_n',
  'price_ex_tax_eur_min',
  'price_ex_tax_eur_median',
  'price_ex_tax_eur_max',
  'bpm_eur_min',
  'bpm_eur_median',
  'bpm_eur_max',
  'bpm_eur_n',
  'kerb_mass_kg_min',
  'kerb_mass_kg_median',
  'kerb_mass_kg_max',
  'cylinders_min',
  'cylinders_median',
  'cylinders_max',
  'cylinders_n',
  'consumption_l100_min',
  'consumption_l100_median',
  'consumption_l100_max',
  'consumption_l100_n',
  'ev_kwh100_min',
  'ev_kwh100_median',
  'ev_kwh100_max',
  'ev_kwh100_n',
  'ev_range_km_min',
  'ev_range_km_median',
  'ev_range_km_max',
  'ev_range_km_n',
  'noise_db_min',
  'noise_db_median',
  'noise_db_max',
  'noise_db_n',
  'fuel_mix',
  'fuel_mix_n',
  'colours',
  'colours_n',
  'body_types',
  'body_types_n',
  'energy_labels',
  'energy_labels_n',
  'recall_open_n',
  'recall_n',
  'scraped_at'
] as const

const numToCell = (v: number | null): string => (v == null ? '' : String(v))
const cellToNum = (v: string | undefined): number | null => (v ? Number(v) : null)
const tallyToCell = (v: RdwTally | null): string => (v == null ? '' : JSON.stringify(v))
const cellToTally = (v: string | undefined): RdwTally | null => (v ? (JSON.parse(v) as RdwTally) : null)

function rowToCsvRecord(r: RdwSpecsRow): Record<(typeof CSV_COLUMNS)[number], string> {
  return {
    kind: r.kind,
    make: r.make,
    model: r.model,
    make_key: r.makeKey,
    model_key: r.modelKey,
    model_year: String(r.modelYear),
    n: String(r.n),
    power_kw_min: numToCell(r.powerKwMin),
    power_kw_median: numToCell(r.powerKwMedian),
    power_kw_max: numToCell(r.powerKwMax),
    displacement_cc_min: numToCell(r.displacementCcMin),
    displacement_cc_median: numToCell(r.displacementCcMedian),
    displacement_cc_max: numToCell(r.displacementCcMax),
    mass_kg_min: numToCell(r.massKgMin),
    mass_kg_median: numToCell(r.massKgMedian),
    mass_kg_max: numToCell(r.massKgMax),
    co2_g_km_min: numToCell(r.co2GKmMin),
    co2_g_km_median: numToCell(r.co2GKmMedian),
    co2_g_km_max: numToCell(r.co2GKmMax),
    gross_mass_kg_min: numToCell(r.grossMassKgMin),
    gross_mass_kg_median: numToCell(r.grossMassKgMedian),
    gross_mass_kg_max: numToCell(r.grossMassKgMax),
    wheelbase_cm_min: numToCell(r.wheelbaseCmMin),
    wheelbase_cm_median: numToCell(r.wheelbaseCmMedian),
    wheelbase_cm_max: numToCell(r.wheelbaseCmMax),
    seats_min: numToCell(r.seatsMin),
    seats_median: numToCell(r.seatsMedian),
    seats_max: numToCell(r.seatsMax),
    doors_min: numToCell(r.doorsMin),
    doors_median: numToCell(r.doorsMedian),
    doors_max: numToCell(r.doorsMax),
    tow_braked_kg_min: numToCell(r.towBrakedKgMin),
    tow_braked_kg_median: numToCell(r.towBrakedKgMedian),
    tow_braked_kg_max: numToCell(r.towBrakedKgMax),
    tow_unbraked_kg_min: numToCell(r.towUnbrakedKgMin),
    tow_unbraked_kg_median: numToCell(r.towUnbrakedKgMedian),
    tow_unbraked_kg_max: numToCell(r.towUnbrakedKgMax),
    length_cm_min: numToCell(r.lengthCmMin),
    length_cm_median: numToCell(r.lengthCmMedian),
    length_cm_max: numToCell(r.lengthCmMax),
    length_cm_n: numToCell(r.lengthCmN),
    width_cm_min: numToCell(r.widthCmMin),
    width_cm_median: numToCell(r.widthCmMedian),
    width_cm_max: numToCell(r.widthCmMax),
    width_cm_n: numToCell(r.widthCmN),
    height_cm_min: numToCell(r.heightCmMin),
    height_cm_median: numToCell(r.heightCmMedian),
    height_cm_max: numToCell(r.heightCmMax),
    height_cm_n: numToCell(r.heightCmN),
    top_speed_kmh_min: numToCell(r.topSpeedKmhMin),
    top_speed_kmh_median: numToCell(r.topSpeedKmhMedian),
    top_speed_kmh_max: numToCell(r.topSpeedKmhMax),
    top_speed_kmh_n: numToCell(r.topSpeedKmhN),
    price_eur_min: numToCell(r.priceEurMin),
    price_eur_median: numToCell(r.priceEurMedian),
    price_eur_max: numToCell(r.priceEurMax),
    price_eur_n: numToCell(r.priceEurN),
    price_ex_tax_eur_min: numToCell(r.priceExTaxEurMin),
    price_ex_tax_eur_median: numToCell(r.priceExTaxEurMedian),
    price_ex_tax_eur_max: numToCell(r.priceExTaxEurMax),
    bpm_eur_min: numToCell(r.bpmEurMin),
    bpm_eur_median: numToCell(r.bpmEurMedian),
    bpm_eur_max: numToCell(r.bpmEurMax),
    bpm_eur_n: numToCell(r.bpmEurN),
    kerb_mass_kg_min: numToCell(r.kerbMassKgMin),
    kerb_mass_kg_median: numToCell(r.kerbMassKgMedian),
    kerb_mass_kg_max: numToCell(r.kerbMassKgMax),
    cylinders_min: numToCell(r.cylindersMin),
    cylinders_median: numToCell(r.cylindersMedian),
    cylinders_max: numToCell(r.cylindersMax),
    cylinders_n: numToCell(r.cylindersN),
    consumption_l100_min: numToCell(r.consumptionL100Min),
    consumption_l100_median: numToCell(r.consumptionL100Median),
    consumption_l100_max: numToCell(r.consumptionL100Max),
    consumption_l100_n: numToCell(r.consumptionL100N),
    ev_kwh100_min: numToCell(r.evKwh100Min),
    ev_kwh100_median: numToCell(r.evKwh100Median),
    ev_kwh100_max: numToCell(r.evKwh100Max),
    ev_kwh100_n: numToCell(r.evKwh100N),
    ev_range_km_min: numToCell(r.evRangeKmMin),
    ev_range_km_median: numToCell(r.evRangeKmMedian),
    ev_range_km_max: numToCell(r.evRangeKmMax),
    ev_range_km_n: numToCell(r.evRangeKmN),
    noise_db_min: numToCell(r.noiseDbMin),
    noise_db_median: numToCell(r.noiseDbMedian),
    noise_db_max: numToCell(r.noiseDbMax),
    noise_db_n: numToCell(r.noiseDbN),
    fuel_mix: tallyToCell(r.fuelMix),
    fuel_mix_n: numToCell(r.fuelMixN),
    colours: tallyToCell(r.colours),
    colours_n: numToCell(r.coloursN),
    body_types: tallyToCell(r.bodyTypes),
    body_types_n: numToCell(r.bodyTypesN),
    energy_labels: tallyToCell(r.energyLabels),
    energy_labels_n: numToCell(r.energyLabelsN),
    recall_open_n: numToCell(r.recallOpenN),
    recall_n: numToCell(r.recallN),
    scraped_at: r.scrapedAt.toISOString()
  }
}

function csvRecordToRow(rec: Record<string, string>): RdwSpecsInsert {
  return {
    kind: rec.kind!,
    make: rec.make!,
    model: rec.model!,
    makeKey: rec.make_key!,
    modelKey: rec.model_key!,
    modelYear: Number(rec.model_year),
    n: Number(rec.n),
    powerKwMin: cellToNum(rec.power_kw_min),
    powerKwMedian: cellToNum(rec.power_kw_median),
    powerKwMax: cellToNum(rec.power_kw_max),
    displacementCcMin: cellToNum(rec.displacement_cc_min),
    displacementCcMedian: cellToNum(rec.displacement_cc_median),
    displacementCcMax: cellToNum(rec.displacement_cc_max),
    massKgMin: cellToNum(rec.mass_kg_min),
    massKgMedian: cellToNum(rec.mass_kg_median),
    massKgMax: cellToNum(rec.mass_kg_max),
    co2GKmMin: cellToNum(rec.co2_g_km_min),
    co2GKmMedian: cellToNum(rec.co2_g_km_median),
    co2GKmMax: cellToNum(rec.co2_g_km_max),
    grossMassKgMin: cellToNum(rec.gross_mass_kg_min),
    grossMassKgMedian: cellToNum(rec.gross_mass_kg_median),
    grossMassKgMax: cellToNum(rec.gross_mass_kg_max),
    wheelbaseCmMin: cellToNum(rec.wheelbase_cm_min),
    wheelbaseCmMedian: cellToNum(rec.wheelbase_cm_median),
    wheelbaseCmMax: cellToNum(rec.wheelbase_cm_max),
    seatsMin: cellToNum(rec.seats_min),
    seatsMedian: cellToNum(rec.seats_median),
    seatsMax: cellToNum(rec.seats_max),
    doorsMin: cellToNum(rec.doors_min),
    doorsMedian: cellToNum(rec.doors_median),
    doorsMax: cellToNum(rec.doors_max),
    towBrakedKgMin: cellToNum(rec.tow_braked_kg_min),
    towBrakedKgMedian: cellToNum(rec.tow_braked_kg_median),
    towBrakedKgMax: cellToNum(rec.tow_braked_kg_max),
    towUnbrakedKgMin: cellToNum(rec.tow_unbraked_kg_min),
    towUnbrakedKgMedian: cellToNum(rec.tow_unbraked_kg_median),
    towUnbrakedKgMax: cellToNum(rec.tow_unbraked_kg_max),
    lengthCmMin: cellToNum(rec.length_cm_min),
    lengthCmMedian: cellToNum(rec.length_cm_median),
    lengthCmMax: cellToNum(rec.length_cm_max),
    lengthCmN: cellToNum(rec.length_cm_n),
    widthCmMin: cellToNum(rec.width_cm_min),
    widthCmMedian: cellToNum(rec.width_cm_median),
    widthCmMax: cellToNum(rec.width_cm_max),
    widthCmN: cellToNum(rec.width_cm_n),
    heightCmMin: cellToNum(rec.height_cm_min),
    heightCmMedian: cellToNum(rec.height_cm_median),
    heightCmMax: cellToNum(rec.height_cm_max),
    heightCmN: cellToNum(rec.height_cm_n),
    topSpeedKmhMin: cellToNum(rec.top_speed_kmh_min),
    topSpeedKmhMedian: cellToNum(rec.top_speed_kmh_median),
    topSpeedKmhMax: cellToNum(rec.top_speed_kmh_max),
    topSpeedKmhN: cellToNum(rec.top_speed_kmh_n),
    priceEurMin: cellToNum(rec.price_eur_min),
    priceEurMedian: cellToNum(rec.price_eur_median),
    priceEurMax: cellToNum(rec.price_eur_max),
    priceEurN: cellToNum(rec.price_eur_n),
    priceExTaxEurMin: cellToNum(rec.price_ex_tax_eur_min),
    priceExTaxEurMedian: cellToNum(rec.price_ex_tax_eur_median),
    priceExTaxEurMax: cellToNum(rec.price_ex_tax_eur_max),
    bpmEurMin: cellToNum(rec.bpm_eur_min),
    bpmEurMedian: cellToNum(rec.bpm_eur_median),
    bpmEurMax: cellToNum(rec.bpm_eur_max),
    bpmEurN: cellToNum(rec.bpm_eur_n),
    kerbMassKgMin: cellToNum(rec.kerb_mass_kg_min),
    kerbMassKgMedian: cellToNum(rec.kerb_mass_kg_median),
    kerbMassKgMax: cellToNum(rec.kerb_mass_kg_max),
    cylindersMin: cellToNum(rec.cylinders_min),
    cylindersMedian: cellToNum(rec.cylinders_median),
    cylindersMax: cellToNum(rec.cylinders_max),
    cylindersN: cellToNum(rec.cylinders_n),
    consumptionL100Min: cellToNum(rec.consumption_l100_min),
    consumptionL100Median: cellToNum(rec.consumption_l100_median),
    consumptionL100Max: cellToNum(rec.consumption_l100_max),
    consumptionL100N: cellToNum(rec.consumption_l100_n),
    evKwh100Min: cellToNum(rec.ev_kwh100_min),
    evKwh100Median: cellToNum(rec.ev_kwh100_median),
    evKwh100Max: cellToNum(rec.ev_kwh100_max),
    evKwh100N: cellToNum(rec.ev_kwh100_n),
    evRangeKmMin: cellToNum(rec.ev_range_km_min),
    evRangeKmMedian: cellToNum(rec.ev_range_km_median),
    evRangeKmMax: cellToNum(rec.ev_range_km_max),
    evRangeKmN: cellToNum(rec.ev_range_km_n),
    noiseDbMin: cellToNum(rec.noise_db_min),
    noiseDbMedian: cellToNum(rec.noise_db_median),
    noiseDbMax: cellToNum(rec.noise_db_max),
    noiseDbN: cellToNum(rec.noise_db_n),
    fuelMix: cellToTally(rec.fuel_mix),
    fuelMixN: cellToNum(rec.fuel_mix_n),
    colours: cellToTally(rec.colours),
    coloursN: cellToNum(rec.colours_n),
    bodyTypes: cellToTally(rec.body_types),
    bodyTypesN: cellToNum(rec.body_types_n),
    energyLabels: cellToTally(rec.energy_labels),
    energyLabelsN: cellToNum(rec.energy_labels_n),
    recallOpenN: cellToNum(rec.recall_open_n),
    recallN: cellToNum(rec.recall_n),
    scrapedAt: new Date(rec.scraped_at!)
  }
}

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db
    .select()
    .from(rdwSpecs)
    .orderBy(rdwSpecs.kind, rdwSpecs.makeKey, rdwSpecs.modelKey, rdwSpecs.modelYear)
  const csv = stringifyCsv(rows.map(rowToCsvRecord), { header: true, columns: [...CSV_COLUMNS] })
  await mkdir(dirname(path), { recursive: true })
  const output = path.endsWith('.gz') ? gzipSync(csv) : csv
  await writeFile(path, output)
  log(`exported ${rows.length} row(s) to ${path} (${(output.length / 1024).toFixed(0)} KB)`)
}

async function importFromCsv(db: Db, path: string): Promise<void> {
  const raw = await readFile(path)
  const isGzip = raw[0] === 0x1f && raw[1] === 0x8b
  const content = isGzip ? gunzipSync(raw).toString('utf8') : raw.toString('utf8')
  const records = parseCsv(content, { columns: true, trim: true }) as Record<string, string>[]
  await upsertAll(db, records.map(csvRecordToRow))
  log(`imported ${records.length} row(s) from ${path}`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const { db, close } = createDb()
  try {
    if (args.exportCsv) {
      await exportToCsv(db, args.exportCsv)
    } else if (args.fromCsv) {
      await importFromCsv(db, args.fromCsv)
    } else {
      const rows = await download(args)
      if (args.dryRun) {
        log(`dry-run: would upsert ${rows.length} row(s)`)
      } else {
        await upsertAll(db, rows)
        log(`upserted ${rows.length} row(s)`)
      }
    }
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
