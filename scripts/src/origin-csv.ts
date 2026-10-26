/**
 * Seed CSV dump/load of the origin tables (`--export-csv` / `--from-csv` of `ingest:brand-origin` and `ingest:wmi`).
 * A seed is the whole table: loading replaces it. `from_year` 0 = since the beginning, `to_year` '' = ongoing.
 */
import { brandOriginPeriod, brandOwnership, wmiPrefix } from '@carplates/db'
import type { BrandOriginPeriodInsert, BrandOwnershipInsert, Db, WmiPrefixInsert } from '@carplates/db'
import { sql } from 'drizzle-orm'

import { readCsv, writeCsv } from './csv-io.js'

const BATCH = 1000

const ORIGIN_COLUMNS = [
  'brand_slug',
  'from_year',
  'to_year',
  'country_code',
  'founded_year',
  'hq_city',
  'source'
] as const
const OWNERSHIP_COLUMNS = ['brand_slug', 'owner_name', 'owner_country', 'from_year', 'to_year', 'source'] as const
const WMI_COLUMNS = ['wmi', 'from_year', 'to_year', 'maker', 'country_code', 'region'] as const

const cell = (v: string | number | null | undefined): string | number => v ?? ''
const numOrNull = (v: string | undefined): number | null => (v ? Number(v) : null)
const textOrNull = (v: string | undefined): string | null => v || null

/** `seed-data/brand-origin.csv.gz` -> `seed-data/brand-ownership.csv.gz` (the periods and the owners are two tables). */
export function ownershipPath(originPath: string): string {
  return originPath.replace(/brand-origin(?=\.csv)/, 'brand-ownership')
}

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`

export async function exportBrandOrigin(db: Db, path: string): Promise<void> {
  const periods = await db
    .select()
    .from(brandOriginPeriod)
    .orderBy(brandOriginPeriod.brandSlug, brandOriginPeriod.fromYear)
  const size = await writeCsv(
    path,
    ORIGIN_COLUMNS,
    periods.map(r => ({
      brand_slug: r.brandSlug,
      from_year: r.fromYear,
      to_year: cell(r.toYear),
      country_code: r.countryCode,
      founded_year: cell(r.foundedYear),
      hq_city: cell(r.hqCity),
      source: r.source
    }))
  )
  console.log(`exported ${periods.length} origin period(s) to ${path} (${kb(size)})`)

  const owners = await db
    .select()
    .from(brandOwnership)
    .orderBy(brandOwnership.brandSlug, brandOwnership.fromYear, brandOwnership.ownerName)
  const ownersPath = ownershipPath(path)
  const ownersSize = await writeCsv(
    ownersPath,
    OWNERSHIP_COLUMNS,
    owners.map(r => ({
      brand_slug: r.brandSlug,
      owner_name: r.ownerName,
      owner_country: cell(r.ownerCountry),
      from_year: r.fromYear,
      to_year: cell(r.toYear),
      source: r.source
    }))
  )
  console.log(`exported ${owners.length} ownership row(s) to ${ownersPath} (${kb(ownersSize)})`)
}

export async function importBrandOrigin(db: Db, path: string): Promise<void> {
  const origin = await readCsv(path)
  const owners = await readCsv(ownershipPath(path))
  if (!origin || !owners) {
    console.log(
      `skipped: no brand-origin / brand-ownership seed next to ${path} (run pnpm export:brand-origin:csv first)`
    )
    return
  }
  const periodRows: BrandOriginPeriodInsert[] = origin.records.map(r => ({
    brandSlug: r.brand_slug!,
    fromYear: Number(r.from_year || 0),
    toYear: numOrNull(r.to_year),
    countryCode: r.country_code!,
    foundedYear: numOrNull(r.founded_year),
    hqCity: textOrNull(r.hq_city),
    source: r.source!
  }))
  const ownerRows: BrandOwnershipInsert[] = owners.records.map(r => ({
    brandSlug: r.brand_slug!,
    ownerName: r.owner_name!,
    ownerCountry: textOrNull(r.owner_country),
    fromYear: Number(r.from_year || 0),
    toYear: numOrNull(r.to_year),
    source: r.source!
  }))
  await db.transaction(async tx => {
    await tx.execute(sql`TRUNCATE registry.brand_origin_period, registry.brand_ownership`)
    for (let i = 0; i < periodRows.length; i += BATCH)
      await tx
        .insert(brandOriginPeriod)
        .values(periodRows.slice(i, i + BATCH))
        .onConflictDoNothing()
    for (let i = 0; i < ownerRows.length; i += BATCH)
      await tx
        .insert(brandOwnership)
        .values(ownerRows.slice(i, i + BATCH))
        .onConflictDoNothing()
  })
  console.log(`loaded ${periodRows.length} origin period(s) and ${ownerRows.length} ownership row(s)`)
}

export async function exportWmi(db: Db, path: string): Promise<void> {
  const rows = await db.select().from(wmiPrefix).orderBy(wmiPrefix.wmi, wmiPrefix.fromYear)
  const size = await writeCsv(
    path,
    WMI_COLUMNS,
    rows.map(r => ({
      wmi: r.wmi,
      from_year: r.fromYear,
      to_year: cell(r.toYear),
      maker: cell(r.maker),
      country_code: cell(r.countryCode),
      region: cell(r.region)
    }))
  )
  console.log(`exported ${rows.length} WMI(s) to ${path} (${kb(size)})`)
}

export async function importWmi(db: Db, path: string): Promise<void> {
  const csv = await readCsv(path)
  if (!csv) {
    console.log(`skipped: no WMI seed at ${path} (run pnpm export:wmi:csv first)`)
    return
  }
  const rows: WmiPrefixInsert[] = csv.records.map(r => ({
    wmi: r.wmi!,
    fromYear: Number(r.from_year || 0),
    toYear: numOrNull(r.to_year),
    maker: textOrNull(r.maker),
    countryCode: textOrNull(r.country_code),
    region: textOrNull(r.region)
  }))
  await db.transaction(async tx => {
    await tx.execute(sql`TRUNCATE registry.wmi_prefix`)
    for (let i = 0; i < rows.length; i += BATCH)
      await tx
        .insert(wmiPrefix)
        .values(rows.slice(i, i + BATCH))
        .onConflictDoNothing()
  })
  console.log(`loaded ${rows.length} WMI(s)`)
}
