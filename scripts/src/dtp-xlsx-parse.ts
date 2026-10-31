import type {
  DtpCauseYearInsert,
  DtpRegionYearInsert,
  DtpRoadYearInsert,
  DtpTimeYearInsert,
  DtpTypeYearInsert
} from '@carplates/db'

import { dtpRegion, roadCode } from './dtp-parse.js'

/** One worksheet as read-excel-file returns it. */
export type PatrolSheet = { sheet: string; data: unknown[][] }

export type PatrolParse = {
  year: number
  /** Last reported month: 12 = full year, 1..9 = year-to-date. */
  period: number
  regions: DtpRegionYearInsert[]
  causes: DtpCauseYearInsert[]
  types: DtpTypeYearInsert[]
  time: DtpTimeYearInsert[]
  roads: DtpRoadYearInsert[]
}

type Counts = { crashes: number | null; deaths: number | null; injured: number | null }

const WEEKDAYS = ['понеділок', 'вівторок', 'середа', 'четвер', "п'ятниця", 'субота', 'неділя']

const text = (v: unknown): string =>
  v === null || v === undefined
    ? ''
    : String(v)
        .replace(/[\s ]+/g, ' ')
        .trim()

const num = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = text(v).replace(',', '.')
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null
}

/** Title of a sheet: its first rows joined (the title text moves between rows and columns across years). */
const sheetTitle = (s: PatrolSheet): string =>
  s.data
    .slice(0, 3)
    .map(row => row.map(text).filter(Boolean).join(' '))
    .join(' | ')

/** `за період з 01.01.2025 по 30.09.2025` → { year: 2025, period: 9 }. */
function reportPeriod(sheets: PatrolSheet[]): { year: number; period: number } {
  for (const s of sheets) {
    const m = /за період з \d{2}\.\d{2}\.(\d{4}) по (\d{2})\.(\d{2})\.(\d{4})/.exec(sheetTitle(s))
    if (m && m[1] === m[4]) return { year: Number(m[4]), period: Number(m[3]) }
  }
  throw new Error('Patrol Police workbook: no "за період з … по …" title found')
}

/** The first sheet whose title matches; sheets are found by title text, never by index (the count and order drift by year). */
const findSheet = (sheets: PatrolSheet[], re: RegExp, not?: RegExp): PatrolSheet | undefined =>
  sheets.find(s => {
    const t = sheetTitle(s)
    return re.test(t) && !(not && not.test(t))
  })

/** Row index of the year-label row (`2024 | 2025 | %`): the first row with two or more cells that are years. */
function yearRow(data: unknown[][]): number {
  return data.findIndex(row => row.filter(c => /^20\d\d$/.test(text(c))).length >= 2)
}

/**
 * Column of each measure for the current year in a two-year table (`2024 | 2025 | %` under `усього | загинуло | травмовано`).
 * The measure label sits above the year row, at or left of the column (merged cells keep the text in the first cell).
 */
function currentYearColumns(data: unknown[][], year: number): Partial<Record<keyof Counts, number>> | null {
  const yr = yearRow(data)
  if (yr < 0) return null
  const cols: Partial<Record<keyof Counts, number>> = {}
  data[yr]?.forEach((cell, c) => {
    if (text(cell) !== String(year)) return
    for (let r = yr - 1; r >= Math.max(0, yr - 3); r--) {
      let label = ''
      for (let k = c; k >= 1 && !label; k--) label = text(data[r]?.[k]).toLowerCase()
      if (!label) continue
      if (label.startsWith('загинуло')) cols.deaths = c
      else if (label.startsWith('травмовано')) cols.injured = c
      else if (label.startsWith('усього')) cols.crashes = c
      break
    }
  })
  return cols.crashes === undefined ? null : cols
}

/** Rows below the year row of a two-year table, with the counts of the current year. */
function twoYearRows(
  s: PatrolSheet,
  year: number,
  label: (row: unknown[]) => string
): { label: string; counts: Counts }[] {
  const cols = currentYearColumns(s.data, year)
  if (!cols) throw new Error(`Patrol Police sheet "${s.sheet}": no ${year} column found`)
  const out: { label: string; counts: Counts }[] = []
  for (const row of s.data.slice(yearRow(s.data) + 1)) {
    const l = label(row)
    const crashes = cols.crashes === undefined ? null : num(row[cols.crashes])
    if (!l || crashes === null) continue
    out.push({
      label: l,
      counts: {
        crashes,
        deaths: cols.deaths === undefined ? null : num(row[cols.deaths]),
        injured: cols.injured === undefined ? null : num(row[cols.injured])
      }
    })
  }
  return out
}

/** Region → crashes for a regional two-year sheet (occupied regions with empty cells drop out). */
function regionTable(s: PatrolSheet | undefined, year: number): Map<string, Counts> {
  const map = new Map<string, Counts>()
  if (!s) return map
  for (const r of twoYearRows(s, year, row => text(row[0]))) {
    const region = dtpRegion(r.label)
    if (region) map.set(region, r.counts)
  }
  return map
}

/** `Вид автопригоди | crashes | deaths | injured` single-year tables (types, causes): label + three numbers. */
function breakdownRows(s: PatrolSheet | undefined): { label: string; counts: Counts }[] {
  if (!s) return []
  const out: { label: string; counts: Counts }[] = []
  for (const row of s.data) {
    const label = text(row[0])
    const [crashes, deaths, injured] = [num(row[1]), num(row[2]), num(row[3])]
    if (!label || crashes === null || deaths === null || injured === null) continue
    if (/^(усього|всього|разом)/i.test(label)) continue
    out.push({ label, counts: { crashes, deaths, injured } })
  }
  return out
}

/**
 * One Patrol Police workbook (`12.2025.xlsx`, `09.2026.xlsx`) → rows for the `registry.dtp_*_year` tables, current year only.
 * Throws for the pre-2022 layout, where the tables count ALL crashes: mixing it with "crashes with injured / killed" would
 * make years incomparable.
 */
export function parsePatrolWorkbook(sheets: PatrolSheet[]): PatrolParse {
  const { year, period } = reportPeriod(sheets)

  const regionSheet = findSheet(sheets, /^Дорожньо-транспортн\S+ пригоди \| за період/)
  if (!regionSheet) throw new Error('Patrol Police workbook: regional table not found')
  if (!/загиблими та\/або травмованими/i.test(regionSheet.data.slice(0, 6).flat().map(text).join(' '))) {
    throw new Error(
      `Patrol Police workbook ${year}: counts all crashes (pre-2022 layout), not crashes with injured / killed`
    )
  }

  const main = regionTable(regionSheet, year)
  const pedestrians = regionTable(findSheet(sheets, /пішоходами/), year)
  const children = regionTable(findSheet(sheets, /скоєнi за учаcтю дітей/), year)
  if (main.size < 20) throw new Error(`Patrol Police workbook ${year}: only ${main.size} regions in the regional table`)

  const regions: DtpRegionYearInsert[] = [...main].map(([region, c]) => ({
    region,
    year,
    period,
    crashes: c.crashes ?? 0,
    deaths: c.deaths ?? 0,
    injured: c.injured ?? 0,
    pedestrianCrashes: pedestrians.get(region)?.crashes ?? null,
    childCrashes: children.get(region)?.crashes ?? null
  }))

  const causes = breakdownRows(findSheet(sheets, /за причинами/)).map(r => ({
    year,
    period,
    cause: r.label,
    crashes: r.counts.crashes ?? 0,
    deaths: r.counts.deaths ?? 0,
    injured: r.counts.injured ?? 0
  }))
  const types = breakdownRows(findSheet(sheets, /за видами/)).map(r => ({
    year,
    period,
    type: r.label,
    crashes: r.counts.crashes ?? 0,
    deaths: r.counts.deaths ?? 0,
    injured: r.counts.injured ?? 0
  }))

  const time: DtpTimeYearInsert[] = []
  const weekdaySheet = findSheet(sheets, /за днем тижня/)
  if (weekdaySheet) {
    for (const r of twoYearRows(weekdaySheet, year, row => text(row[0]).toLowerCase())) {
      const bucket = WEEKDAYS.indexOf(r.label.replace(/’|ʼ/g, "'")) + 1
      if (bucket > 0) time.push({ year, period, dim: 'weekday', bucket, crashes: r.counts.crashes ?? 0 })
    }
  }
  const hourSheet = findSheet(sheets, /за часом скоєння/)
  if (hourSheet) {
    for (const r of twoYearRows(hourSheet, year, row => text(row[0]))) {
      const bucket = /^\d{1,2}$/.test(r.label) ? Number(r.label) : -1
      if (bucket >= 0 && bucket <= 23) time.push({ year, period, dim: 'hour', bucket, crashes: r.counts.crashes ?? 0 })
    }
  }

  const roadSheet = findSheet(sheets, /на автодорогах державного значення/)
  const roads: DtpRoadYearInsert[] = []
  if (roadSheet) {
    const byCode = new Map<string, DtpRoadYearInsert>()
    for (const r of twoYearRows(roadSheet, year, row => (roadCode(text(row[0])) ? text(row[0]) : ''))) {
      const code = roadCode(r.label) as string
      const name = text(roadSheet.data.find(row => text(row[0]) === r.label)?.[1])
      byCode.set(code, {
        roadCode: code,
        year,
        period,
        roadName: name || r.label.replace(/^\S+\s*/, ''),
        crashes: r.counts.crashes ?? 0,
        deaths: r.counts.deaths ?? 0,
        injured: r.counts.injured ?? 0
      })
    }
    roads.push(...byCode.values())
  }

  return { year, period, regions, causes, types, time, roads }
}
