/**
 * Deterministic synthetic data for local development. ~1000 registration rows
 * across regions, some with VINs, a handful of plates with 2-3 registration
 * actions so the history path is exercised. No network, no source files.
 *
 *   pnpm db:seed        (drops registry.registrations first, then reseeds)
 */

import { sql } from 'drizzle-orm'

import { createDb, refreshCurrentRegistration, refreshStats, registrations } from '@carplates/db'
import type { RegistrationInsert } from '@carplates/db'
import { normalizePlate, REGIONS } from '@carplates/shared'

import { BODIES, COLORS, FUELS, makeVin, MODELS, OPERS, pick, PLATE_LETTERS, rng } from './reference.js'

const TOTAL = 1000
const REGION_PREFIXES = Object.keys(REGIONS)

function plate(r: () => number): string {
  const prefix = pick(r, REGION_PREFIXES)
  const digits = String(Math.floor(r() * 9000) + 1000)
  const tail = pick(r, PLATE_LETTERS.split('')) + pick(r, PLATE_LETTERS.split(''))
  return normalizePlate(`${prefix}${digits}${tail}`)
}

function row(
  r: () => number,
  plateNo: string,
  year: number,
  opts: Partial<RegistrationInsert> = {}
): RegistrationInsert {
  const m = pick(r, MODELS)
  const month = String(Math.floor(r() * 12) + 1).padStart(2, '0')
  const day = String(Math.floor(r() * 28) + 1).padStart(2, '0')
  const oper = pick(r, OPERS)
  return {
    plate: plateNo,
    person: 'P',
    regAddrKoatuu: String(Math.floor(r() * 9_000_000_000) + 1_000_000_000),
    operCode: oper.code,
    operName: oper.name,
    dReg: `${year}-${month}-${day}`,
    depCode: String(Math.floor(r() * 9000) + 1000),
    dep: `ТСЦ ${Math.floor(r() * 9000) + 1000}`,
    brand: m.brand,
    model: m.model,
    vin: r() < 0.55 ? makeVin(r) : null,
    makeYear: year - Math.floor(r() * 3),
    color: pick(r, COLORS),
    kind: m.kind,
    body: pick(r, BODIES),
    purpose: 'ЗАГАЛЬНИЙ',
    fuel: pick(r, FUELS),
    capacity: [1498, 1598, 1968, 1997, 2494, 0][Math.floor(r() * 6)] ?? 1598,
    ownWeight: 1200 + Math.floor(r() * 600),
    totalWeight: 1700 + Math.floor(r() * 800),
    sourceResourceId: 'seed',
    ...opts
  }
}

async function main(): Promise<void> {
  const r = rng(42)
  const rows: RegistrationInsert[] = []

  // Fixed rows the verification steps rely on.
  rows.push(
    row(r, normalizePlate('ВЕ7116АА'), 2018, {
      brand: 'TOYOTA',
      model: 'CAMRY',
      vin: 'JT1BE32K900000001',
      color: 'ЧОРНИЙ',
      kind: 'ЛЕГКОВИЙ'
    })
  )
  rows.push(
    row(r, normalizePlate('АА1234ВС'), 2015, { brand: 'VOLKSWAGEN', model: 'GOLF', color: 'СІРИЙ', kind: 'ЛЕГКОВИЙ' })
  )
  // One plate, three registration actions (history path).
  const [op100, op300, op390] = OPERS as [(typeof OPERS)[number], (typeof OPERS)[number], (typeof OPERS)[number]]
  const hist = normalizePlate('КА0001АА')
  rows.push(
    row(r, hist, 2013, {
      operCode: op100.code,
      operName: op100.name,
      brand: 'BMW',
      model: '320',
      color: 'СИНІЙ',
      dReg: '2013-04-12'
    })
  )
  rows.push(
    row(r, hist, 2013, {
      operCode: op300.code,
      operName: op300.name,
      brand: 'BMW',
      model: '320',
      color: 'СИНІЙ',
      dReg: '2017-09-03'
    })
  )
  rows.push(
    row(r, hist, 2013, {
      operCode: op390.code,
      operName: op390.name,
      brand: 'BMW',
      model: '320',
      color: 'ЧОРНИЙ',
      dReg: '2021-06-21'
    })
  )

  // Bulk random rows; ~1 in 25 gets a second/third action.
  while (rows.length < TOTAL) {
    const p = plate(r)
    const year = 2005 + Math.floor(r() * 20)
    rows.push(row(r, p, year))
    if (r() < 0.04) {
      rows.push(row(r, p, year, { operCode: op300.code, operName: op300.name, dReg: `${year + 3}-01-15` }))
      if (r() < 0.4)
        rows.push(row(r, p, year, { operCode: op390.code, operName: op390.name, dReg: `${year + 6}-08-01` }))
    }
  }

  const { db, close } = createDb()
  try {
    await db.execute(sql`TRUNCATE registry.registrations RESTART IDENTITY`)
    for (let i = 0; i < rows.length; i += 500) {
      await db
        .insert(registrations)
        .values(rows.slice(i, i + 500))
        .onConflictDoNothing()
    }
    await refreshCurrentRegistration(db)
    await refreshStats(db)
    const { rows: countRows } = await db.execute<{ n: number }>(
      sql`SELECT count(*)::int AS n FROM registry.registrations`
    )
    console.log(`seeded ${countRows[0]?.n ?? 0} rows; current_registration + stats rollups refreshed`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
