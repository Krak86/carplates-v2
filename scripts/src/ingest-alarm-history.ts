/**
 * Loads air-raid alert history into `registry.alarm_history_daily` from the MIT-licensed siren dataset
 * (github.com/Vadimkin/ukrainian-air-raid-sirens-dataset: credit it and eTryvoga in About). Rolled up per oblast, source and
 * UTC start day; see `alarm-history-parse.ts` for the merge rules. Crimea, Sevastopol and the permanent Luhansk alert are
 * not in the dataset.
 *
 *   pnpm ingest:alarm-history                     # download both CSVs from GitHub, replace the table
 *   pnpm ingest:alarm-history --dir <folder>      # read official_data_en.csv / volunteer_data_en.csv from a folder
 *   pnpm ingest:alarm-history --dry-run           # roll up and print, write nothing
 *   pnpm ingest:alarm-history --export-csv seed-data/alarm-history.csv.gz
 *   pnpm ingest:alarm-history --from-csv seed-data/alarm-history.csv.gz    # load a dump (replaces the table), no network
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { createDb } from '@carplates/db'
import type { AlarmHistoryDailyInsert } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'

import { exportAlarmHistory, importAlarmHistory, replaceAlarmHistory } from './alarm-history-csv.js'
import { intervalsFromOfficial, intervalsFromVolunteer, rollupByDay } from './alarm-history-parse.js'
import type { AlarmHistoryDay, ParsedRows } from './alarm-history-parse.js'

const BASE_URL = 'https://raw.githubusercontent.com/Vadimkin/ukrainian-air-raid-sirens-dataset/main/datasets'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const TIMEOUT_MS = 120_000

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function readSource(file: string, dir: string | undefined): Promise<Record<string, string>[]> {
  const text = dir
    ? await readFile(join(dir, file), 'utf8')
    : await fetch(`${BASE_URL}/${file}`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      }).then(res => {
        if (!res.ok) throw new Error(`${file} answered ${res.status}`)
        return res.text()
      })
  return parseCsv(text, { columns: true, skip_empty_lines: true, bom: true }) as Record<string, string>[]
}

function report(name: string, parsed: ParsedRows, days: readonly AlarmHistoryDay[]): void {
  log(`${name}: ${parsed.intervals.length} row(s) used, ${parsed.skipped} skipped, ${days.length} day row(s)`)
}

async function collect(dir: string | undefined): Promise<AlarmHistoryDay[]> {
  const official = intervalsFromOfficial(await readSource('official_data_en.csv', dir))
  const officialDays = rollupByDay('official', official.intervals)
  report('official', official, officialDays)
  const volunteer = intervalsFromVolunteer(await readSource('volunteer_data_en.csv', dir))
  const volunteerDays = rollupByDay('volunteer', volunteer.intervals)
  report('volunteer', volunteer, volunteerDays)
  return [...officialDays, ...volunteerDays]
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const valueOf = (flag: string): string | undefined => argv[argv.indexOf(flag) + 1]
  const exportCsv = argv.includes('--export-csv') ? valueOf('--export-csv') : undefined
  const fromCsv = argv.includes('--from-csv') ? valueOf('--from-csv') : undefined

  if (exportCsv || fromCsv) {
    const { db, close } = createDb()
    try {
      if (exportCsv) await exportAlarmHistory(db, exportCsv)
      else if (fromCsv) await importAlarmHistory(db, fromCsv)
    } finally {
      await close()
    }
    return
  }

  const days = await collect(argv.includes('--dir') ? valueOf('--dir') : undefined)
  if (argv.includes('--dry-run')) {
    log(`${days.length} day row(s) in total; first ${days[0]?.day}, last ${days[days.length - 1]?.day}`)
    log('dry-run: nothing written')
    return
  }
  const rows: AlarmHistoryDailyInsert[] = days
  const { db, close } = createDb()
  try {
    await replaceAlarmHistory(db, rows)
    log(`written ${rows.length} day row(s) to registry.alarm_history_daily`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
