/**
 * EEA "Monitoring of CO2 emissions from passenger cars" (Regulation (EU) 2019/631) via the EEA's public DiscoData
 * SQL REST endpoint. The raw data is one row per registered car (tens of millions), so the grouping happens
 * server-side: one request returns a few thousand (make, name, fuel, mode, engine cc) groups per year, never raw rows.
 *
 * Pure helpers (`parseEeaGroup`, `collapseEeaGroups`) are separate from the fetch so they are unit-testable.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { FuelEconomyInsert } from '@carplates/db'
import { makeKey, modelKey } from '@carplates/shared'
import type { VehicleFuel } from '@carplates/shared'
import { z } from 'zod'

export const EEA_SOURCE = 'eea'
const SQL_URL = 'https://discodata.eea.europa.eu/sql'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
/** One page must hold a whole year: ~10-30k groups. A full page means truncation, which `fetchEeaSlice` refuses. */
const PAGE_SIZE = 100_000
const REQUEST_DELAY_MS = 1000
const MAX_ATTEMPTS = 4
const CACHE_DIR = join(import.meta.dirname, '..', '.data', 'fuel', 'eea')

/** One yearly slice. `where` narrows the shared `co2cars` table (2010-2022, Final + Provisional copies of a year). */
export type EeaSlice = { year: number; table: string; where: string }

/**
 * Years kept: 2010+ (NEDC until 2018/2019). The registry fleet is old — a 2015 start left most 2005-2011 Octavia/Megane/Astra
 * unmatched against the +/-3 year window — while the grouped yearly output stays small (~10-20k rows a year).
 * 2023's table name isn't published on the dataset page, so it is probed (`probeEeaTable`).
 */
export const EEA_FIRST_YEAR = 2010
const CO2CARS = '[CO2Emission].[latest].[co2cars]'
export const EEA_FIXED_SLICES: readonly EeaSlice[] = [
  ...Array.from({ length: 2021 - EEA_FIRST_YEAR + 1 }, (_, i) => EEA_FIRST_YEAR + i).map(year => ({
    year,
    table: CO2CARS,
    where: `Year = ${year} AND Status = 'F'`
  })),
  // 2022 only exists as a provisional copy in the shared table.
  { year: 2022, table: CO2CARS, where: `Year = 2022` },
  { year: 2024, table: '[CO2Emission].[latest].[co2cars_2024Fv30]', where: '1 = 1' },
  { year: 2025, table: '[CO2Emission].[latest].[co2cars_2025Pv31]', where: '1 = 1' }
]
export const EEA_2023_CANDIDATE_VERSIONS = Array.from({ length: 12 }, (_, i) => 20 + i)

const log = (...m: unknown[]): void => {
  console.log(...m)
}
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

const CO2_EXPR = 'COALESCE([Ewltp (g/km)], [Enedc (g/km)], [E (g/km)])'
const CYCLE_EXPR = `CASE WHEN [Ewltp (g/km)] IS NOT NULL THEN 'WLTP' ELSE 'NEDC' END`

export function buildGroupQuery(slice: EeaSlice): string {
  return [
    `SELECT Mk, Cn, Ft, Fm, [Ec (cm3)] AS ec, ${CYCLE_EXPR} AS cyc,`,
    `SUM(R) AS regs, AVG(CAST(${CO2_EXPR} AS float)) AS co2, AVG(CAST(Fc AS float)) AS fc, AVG(CAST([Z (Wh/km)] AS float)) AS z`,
    `FROM ${slice.table} WHERE ${slice.where}`,
    `GROUP BY Mk, Cn, Ft, Fm, [Ec (cm3)], ${CYCLE_EXPR}` // no ORDER BY: the endpoint rejects it together with CASE
  ].join(' ')
}

const groupSchema = z.object({
  Mk: z.string().nullable(),
  Cn: z.string().nullable(),
  Ft: z.string().nullable(),
  Fm: z.string().nullable(),
  ec: z.number().nullable(),
  cyc: z.enum(['WLTP', 'NEDC']),
  regs: z.number().nullable(),
  co2: z.number().nullable(),
  fc: z.number().nullable(),
  z: z.number().nullable()
})
export type EeaGroup = z.infer<typeof groupSchema>

const responseSchema = z.object({ results: z.array(groupSchema) })

async function queryPage(query: string, page: number): Promise<EeaGroup[]> {
  const url = `${SQL_URL}?${new URLSearchParams({ query, p: String(page), nrOfHits: String(PAGE_SIZE) }).toString()}`
  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const body: unknown = await res.json()
      const parsed = responseSchema.safeParse(body)
      if (!parsed.success) throw new Error(`unexpected response: ${JSON.stringify(body).slice(0, 400)}`)
      return parsed.data.results
    } catch (err) {
      lastErr = err
      if (attempt < MAX_ATTEMPTS) await sleep(2000 * attempt)
    }
  }
  throw lastErr
}

/** Whether `table` exists and has rows — used to find 2023's table name. */
export async function probeEeaTable(table: string): Promise<boolean> {
  const url = `${SQL_URL}?${new URLSearchParams({ query: `SELECT TOP 1 Mk FROM ${table}`, p: '1', nrOfHits: '1' }).toString()}`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) return false
    const json = (await res.json()) as { results?: unknown[] }
    return (json.results?.length ?? 0) > 0
  } catch {
    return false
  }
}

/** All grouped rows for a slice, cached on disk so a re-run makes no requests (`refresh` bypasses the cache). */
export async function fetchEeaSlice(slice: EeaSlice, refresh: boolean): Promise<EeaGroup[]> {
  const cachePath = join(CACHE_DIR, `${slice.year}.json`)
  if (!refresh && existsSync(cachePath)) {
    return groupSchema.array().parse(JSON.parse(await readFile(cachePath, 'utf8')))
  }
  const query = buildGroupQuery(slice)
  const all = await queryPage(query, 1)
  if (all.length >= PAGE_SIZE)
    throw new Error(`EEA ${slice.year}: result hit the page limit (${PAGE_SIZE}) — would be truncated`)
  await sleep(REQUEST_DELAY_MS)
  await mkdir(dirname(cachePath), { recursive: true })
  await writeFile(cachePath, JSON.stringify(all))
  return all
}

/** "TOYOTA LAND CRUISER (150 SERIES)" / "COROLLA   1.8   HIBRID CVT" → the bare model, without make prefix or variant tail. */
export function normalizeEeaModel(name: string, make: string): string {
  const head = (name.split(/\s{2,}|\(/)[0] ?? '').trim()
  const prefix = make.toUpperCase()
  return head.toUpperCase().startsWith(`${prefix} `) ? head.slice(prefix.length + 1).trim() : head
}

type Powertrain = FuelEconomyInsert['powertrain']

export function eeaPowertrain(ft: string, fm: string): Powertrain {
  const fuel = ft.toLowerCase()
  if (fuel.includes('hydrogen')) return 'fcev'
  if (fm === 'E' || fuel === 'electric') return 'ev'
  if (fm === 'P') return 'phev'
  if (fm === 'H') return 'hybrid'
  return 'ice'
}

export function eeaFuelCategory(ft: string): VehicleFuel | null {
  const fuel = ft.toLowerCase()
  if (fuel.includes('hydrogen')) return 'hydrogen'
  if (fuel === 'electric') return 'electric'
  if (fuel.includes('diesel')) return 'diesel'
  if (fuel.includes('petrol') || fuel.includes('e85') || fuel.includes('ethanol')) return 'petrol'
  if (fuel.includes('lpg') || fuel === 'ng' || fuel.includes('cng') || fuel.includes('gas')) return 'gas'
  if (fuel.includes('electric')) return 'electric'
  return null
}

const round1 = (v: number): number => Math.round(v * 10) / 10

type Acc = {
  row: FuelEconomyInsert
  regs: number
  co2Sum: number
  fcSum: number
  fcRegs: number
  zSum: number
  zRegs: number
}

/**
 * Parses server-side groups for one year and merges those that normalize to the same (make, model, fuel, powertrain,
 * engine, cycle) — several variant names collapse into one model — with registration-weighted averages.
 */
export function collapseEeaGroups(year: number, groups: readonly EeaGroup[]): FuelEconomyInsert[] {
  const byId = new Map<string, Acc>()
  for (const g of groups) {
    if (!g.Mk || !g.Cn || !g.Ft || g.co2 == null) continue
    const make = g.Mk.trim()
    const model = normalizeEeaModel(g.Cn, make)
    const mk = makeKey(make)
    const mdk = modelKey(model)
    const category = eeaFuelCategory(g.Ft)
    if (!mk || !mdk || !category) continue

    const powertrain = eeaPowertrain(g.Ft, g.Fm ?? '')
    const engineCc = g.ec && g.ec > 0 ? Math.round(g.ec) : null
    const id = `${EEA_SOURCE}:${year}:${mk}:${mdk}:${category}:${powertrain}:${engineCc ?? 0}:${g.cyc}`
    const weight = Math.max(g.regs ?? 1, 1)

    const acc =
      byId.get(id) ??
      ({
        row: {
          id,
          source: EEA_SOURCE,
          cycle: g.cyc,
          make,
          model,
          makeKey: mk,
          modelKey: mdk,
          modelYear: year,
          fuelType: g.Ft,
          fuelCategory: category,
          powertrain,
          engineCc,
          cylinders: null,
          l100km: null,
          co2GKm: null,
          evKwh100km: null
        },
        regs: 0,
        co2Sum: 0,
        fcSum: 0,
        fcRegs: 0,
        zSum: 0,
        zRegs: 0
      } satisfies Acc)
    acc.regs += weight
    acc.co2Sum += g.co2 * weight
    if (g.fc != null) {
      acc.fcSum += g.fc * weight
      acc.fcRegs += weight
    }
    if (g.z != null) {
      acc.zSum += g.z * weight
      acc.zRegs += weight
    }
    byId.set(id, acc)
  }

  return [...byId.values()].map(a => ({
    ...a.row,
    co2GKm: Math.round(a.co2Sum / a.regs),
    l100km: a.fcRegs > 0 ? round1(a.fcSum / a.fcRegs) : null,
    // Wh/km → kWh/100 km is ÷10.
    evKwh100km: a.zRegs > 0 ? round1(a.zSum / a.zRegs / 10) : null
  }))
}

/** Every slice to fetch, with 2023's table name found by probing candidate versions (or skipped with a warning). */
export async function resolveEeaSlices(): Promise<EeaSlice[]> {
  const slices = [...EEA_FIXED_SLICES]
  for (const v of EEA_2023_CANDIDATE_VERSIONS) {
    const table = `[CO2Emission].[latest].[co2cars_2023Fv${v}]`
    if (await probeEeaTable(table)) {
      log(`found the 2023 table: ${table}`)
      slices.push({ year: 2023, table, where: '1 = 1' })
      break
    }
    await sleep(300)
  }
  if (!slices.some(s => s.year === 2023)) log('warn: no 2023 table found among the probed names — skipping 2023')
  return slices.sort((a, b) => a.year - b.year)
}
