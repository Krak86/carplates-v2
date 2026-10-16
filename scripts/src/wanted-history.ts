/**
 * Backfills the wanted-vehicles history from stolen.in.ua (same National Police open data, robots.txt `Allow: /`). The police feed lists
 * only CURRENT records, so cars found before our first `ingest:wanted` run exist nowhere else. See WANTED_PLAN.md.
 *
 *   Phase A (months):  /history/<mon>-<yy> lists every car stolen that month; FOUND cards not yet in our table become
 *                      `source = 'stolen.in.ua'` placeholder rows (`resolved_exact = false`, resolved_at = scrape time).
 *   Phase B (details): /v/<plate|VIN> shows every record of that id incl. the exact "removed from wanted" date; the rows are
 *                      upserted and replace the placeholders. Resumable via `registry.wanted_scrape_ids`.
 *
 *   pnpm ingest:wanted-history --from 2020-08 --to 2020-08   # a month range (months and details)
 *   pnpm ingest:wanted-history --from 2025-01                # ... up to the current month
 *   pnpm ingest:wanted-history                               # no range: only the last 2 months (daily refresh)
 *   pnpm ingest:wanted-history --from 2020-08 --to 2020-08 --no-details   # month cards only
 *   pnpm ingest:wanted-history --from 2020-08 --to 2020-08 --dry-run      # fetch + parse + print, write nothing
 */
import { createDb, wantedScrapeIds, wantedScrapePages, wantedVehicles } from '@carplates/db'
import type { Db } from '@carplates/db'
import { isVin, normalizePlate } from '@carplates/shared'
import { and, eq, gte, inArray, lt, or, sql } from 'drizzle-orm'

import { organUnitRegion } from './wanted-parse.js'
import {
  isPlaceholderIdent,
  monthSlug,
  parseDetailRecords,
  parseMonthCards,
  parseMonthTotals
} from './wanted-history-parse.js'
import type { DetailRecord, MonthCard } from './wanted-history-parse.js'

const BASE = 'https://stolen.in.ua'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const SOURCE = 'stolen.in.ua'
const FIRST_MONTH = '2020-08'
const DELAY_MS = 1000
const RETRIES = 6 // backoff 5+10+15+20+25 s: rides out a short stolen.in.ua 502 burst

type Args = { from?: string; to?: string; details: boolean; dryRun: boolean }

function parseArgs(argv: string[]): Args {
  const a: Args = { details: true, dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--from') a.from = argv[++i]
    else if (arg === '--to') a.to = argv[++i]
    else if (arg === '--no-details') a.details = false
    else if (arg === '--dry-run') a.dryRun = true
  }
  for (const v of [a.from, a.to])
    if (v && !/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) throw new Error(`bad month "${v}" (YYYY-MM)`)
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}
const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms))

let lastFetchAt = 0
/** One request per second, a few retries on 5xx / network errors. `null` = 404 (unknown id / future month). */
async function fetchHtml(path: string): Promise<string | null> {
  for (let attempt = 1; ; attempt++) {
    const wait = lastFetchAt + DELAY_MS - Date.now()
    if (wait > 0) await sleep(wait)
    lastFetchAt = Date.now()
    try {
      const res = await fetch(`${BASE}${path}`, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'uk' } })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (err) {
      if (attempt >= RETRIES) throw new Error(`${BASE}${path}: ${String(err)}`, { cause: err })
      await sleep(attempt * 5000)
    }
  }
}

/** `[ym, …]` from `from` to `to` inclusive; no range = the last 2 months. */
function monthRange(args: Args): { year: number; month: number }[] {
  const now = new Date()
  const cur = now.getUTCFullYear() * 12 + now.getUTCMonth()
  const idx = (ym: string): number => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1
  const from = args.from || args.to ? Math.max(idx(args.from ?? FIRST_MONTH), idx(FIRST_MONTH)) : cur - 1
  const to = args.to ? Math.min(idx(args.to), cur) : cur
  const out: { year: number; month: number }[] = []
  for (let i = from; i <= to; i++) out.push({ year: Math.floor(i / 12), month: (i % 12) + 1 })
  return out
}

/** A stolen.in.ua id → the columns it can fill (a plate, a VIN, or nothing for placeholders). */
function identColumns(ident: string): { plate: string | null; vin: string | null } {
  if (isPlaceholderIdent(ident)) return { plate: null, vin: null }
  const upper = ident.replace(/\s+/g, '').toUpperCase()
  return isVin(upper) ? { plate: null, vin: upper } : { plate: normalizePlate(upper), vin: null }
}

type Existing = { plate: string | null; vin: string | null; vinAlt: string | null; seizedAt: string | null }

const monthBounds = (year: number, month: number): [string, string] => {
  const next = month === 12 ? [year + 1, 1] : [year, month + 1]
  return [`${year}-${String(month).padStart(2, '0')}-01`, `${next[0]}-${String(next[1]).padStart(2, '0')}-01`]
}

/** Phase A for one month: placeholder rows for found cards that our table does not already hold. */
async function importMonth(
  db: Db,
  args: Args,
  year: number,
  month: number
): Promise<{ cards: number; found: number; inserted: number; detailIdents: string[] }> {
  const slug = monthSlug(year, month)
  const html = await fetchHtml(`/history/${slug}`)
  if (!html) {
    log(`${slug}: no page`)
    return { cards: 0, found: 0, inserted: 0, detailIdents: [] }
  }
  const cards = parseMonthCards(html, year)
  const totals = parseMonthTotals(html)
  const foundCards = cards.filter(c => c.found)
  log(
    `${slug}: ${cards.length} card(s), ${foundCards.length} found` +
      (totals ? ` (header: ${totals.stolen} stolen / ${totals.found} found)` : '')
  )
  const detailIdents = [...new Set(foundCards.map(c => c.ident).filter(i => !isPlaceholderIdent(i)))]
  if (args.dryRun) return { cards: cards.length, found: foundCards.length, inserted: 0, detailIdents }

  const [lo, hi] = monthBounds(year, month)
  const existing: Existing[] = await db
    .select({
      plate: wantedVehicles.plate,
      vin: wantedVehicles.vin,
      vinAlt: wantedVehicles.vinAlt,
      seizedAt: wantedVehicles.seizedAt
    })
    .from(wantedVehicles)
    .where(and(gte(wantedVehicles.seizedAt, lo), lt(wantedVehicles.seizedAt, hi)))
  const have = new Set(
    existing.flatMap(e => [e.plate, e.vin, e.vinAlt].filter(Boolean).map(id => `${id}|${e.seizedAt}`))
  )

  const seen = new Map<string, number>()
  const now = new Date()
  const rows: (typeof wantedVehicles.$inferInsert)[] = []
  for (const c of foundCards) {
    const { plate, vin } = identColumns(c.ident)
    if ((plate ?? vin) && have.has(`${plate ?? vin}|${c.seizedAt}`)) continue
    rows.push(placeholderRow(c, slug, plate, vin, seen, now))
  }
  for (let i = 0; i < rows.length; i += 1000) {
    await db
      .insert(wantedVehicles)
      .values(rows.slice(i, i + 1000))
      .onConflictDoNothing({ target: wantedVehicles.sourceId })
  }
  await db
    .insert(wantedScrapePages)
    .values({ month: slug, cards: cards.length })
    .onConflictDoUpdate({
      target: wantedScrapePages.month,
      set: { cards: cards.length, fetchedAt: sql`now()` }
    })
  return { cards: cards.length, found: foundCards.length, inserted: rows.length, detailIdents }
}

function placeholderRow(
  c: MonthCard,
  slug: string,
  plate: string | null,
  vin: string | null,
  seen: Map<string, number>,
  now: Date
): typeof wantedVehicles.$inferInsert {
  // Identical cards (placeholder ids, same car twice) get an occurrence number so each keeps its own stable row id.
  const base = `si:${slug}:${c.ident}:${c.seizedAt}:${c.brand}:${c.model}`
  const n = (seen.get(base) ?? 0) + 1
  seen.set(base, n)
  return {
    sourceId: `${base}#${n}`,
    plate,
    vin,
    brand: c.brand,
    model: c.model,
    vehicleType: c.vehicleType,
    seizedAt: c.seizedAt,
    lastSeenAt: now,
    resolvedAt: now,
    resolvedExact: false,
    source: SOURCE
  }
}

/** Phase B for one id: store every removed record with its exact date; drop the month-card placeholder it supersedes. */
async function importDetail(db: Db, ident: string): Promise<number> {
  const html = await fetchHtml(`/v/${encodeURIComponent(ident)}`)
  const records = html ? parseDetailRecords(html).filter(r => !r.current) : []
  let stored = 0
  for (const r of records) stored += await saveRecord(db, r)
  await db
    .insert(wantedScrapeIds)
    .values({ ident, status: html ? `${records.length} removed` : '404' })
    .onConflictDoUpdate({
      target: wantedScrapeIds.ident,
      set: { status: html ? `${records.length} removed` : '404', fetchedAt: sql`now()` }
    })
  return stored
}

async function saveRecord(db: Db, r: DetailRecord): Promise<number> {
  if (!r.resolvedAt) return 0
  const plate = r.plate && !isPlaceholderIdent(r.plate) ? normalizePlate(r.plate) : null
  const vins = [r.bodyNumber, r.chassisNumber]
    .map(v => v?.replace(/\s+/g, '').toUpperCase() ?? '')
    .filter((v, i, all) => isVin(v) && all.indexOf(v) === i)
  const vin = vins[0] ?? null
  const vinAlt = vins[1] ?? null
  const ids = [plate, vin, vinAlt].filter((v): v is string => !!v)
  if (ids.length === 0 || !r.seizedAt) return 0
  const resolvedAt = new Date(`${r.resolvedAt}T00:00:00Z`)

  // Same car and theft date already in the table (feed row or an earlier scrape): only fill an empty resolved_at.
  const candidates = await db
    .select({
      sourceId: wantedVehicles.sourceId,
      source: wantedVehicles.source,
      organUnit: wantedVehicles.organUnit,
      resolvedAt: wantedVehicles.resolvedAt,
      resolvedExact: wantedVehicles.resolvedExact
    })
    .from(wantedVehicles)
    .where(
      and(
        eq(wantedVehicles.seizedAt, r.seizedAt),
        or(inArray(wantedVehicles.plate, ids), inArray(wantedVehicles.vin, ids), inArray(wantedVehicles.vinAlt, ids))
      )
    )
  const real = candidates.filter(c => c.resolvedExact !== false || c.source !== SOURCE)
  const same = real.find(c => (c.organUnit ?? null) === (r.organUnit ?? null))
  if (same) {
    if (!same.resolvedAt)
      await db.update(wantedVehicles).set({ resolvedAt }).where(eq(wantedVehicles.sourceId, same.sourceId))
  } else {
    await db
      .insert(wantedVehicles)
      .values({
        sourceId: `si:${r.plate ?? r.bodyNumber}:${r.seizedAt}:${r.organUnit ?? ''}`.slice(0, 300),
        plate,
        vin,
        vinAlt,
        brand: r.brand,
        model: r.model,
        vehicleType: r.vehicleType,
        color: r.color,
        seizedAt: r.seizedAt,
        registeredAt: r.registeredAt,
        organUnit: r.organUnit,
        region: organUnitRegion(r.organUnit),
        lastSeenAt: resolvedAt,
        resolvedAt,
        resolvedExact: true,
        source: SOURCE
      })
      .onConflictDoNothing({ target: wantedVehicles.sourceId })
  }
  // The month-card placeholder of this car is now superseded by an exact row.
  await db
    .delete(wantedVehicles)
    .where(
      and(
        eq(wantedVehicles.source, SOURCE),
        eq(wantedVehicles.resolvedExact, false),
        eq(wantedVehicles.seizedAt, r.seizedAt),
        or(inArray(wantedVehicles.plate, ids), inArray(wantedVehicles.vin, ids))
      )
    )
  return 1
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const months = monthRange(args)
  const forceDetails = !args.from && !args.to // the daily refresh re-checks ids it has seen before
  log(
    `months ${monthSlug(months[0]!.year, months[0]!.month)} → ${monthSlug(months.at(-1)!.year, months.at(-1)!.month)}` +
      `${args.details ? '' : ', no details'}${args.dryRun ? ', dry run' : ''}`
  )

  const { db, close } = createDb()
  try {
    const done = new Set(
      args.dryRun || forceDetails
        ? []
        : (await db.select({ ident: wantedScrapeIds.ident }).from(wantedScrapeIds)).map(r => r.ident)
    )
    let inserted = 0
    let detailRows = 0
    let detailPages = 0
    for (const { year, month } of months) {
      const res = await importMonth(db, args, year, month)
      inserted += res.inserted
      if (!args.details || args.dryRun) continue
      const todo = res.detailIdents.filter(i => !done.has(i))
      for (const [n, ident] of todo.entries()) {
        detailRows += await importDetail(db, ident)
        detailPages++
        done.add(ident)
        if ((n + 1) % 100 === 0) log(`  ${monthSlug(year, month)}: ${n + 1}/${todo.length} detail page(s)`)
      }
    }
    log(`done: ${inserted} placeholder row(s), ${detailPages} detail page(s), ${detailRows} exact record(s)`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
