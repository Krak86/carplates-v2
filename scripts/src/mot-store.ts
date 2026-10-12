import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { motBaseline, motIssues, motKeys, motMeta, motReasons, motStats } from '@carplates/db'
import type { Db, MotCounts } from '@carplates/db'
import type { MotKind } from '@carplates/shared'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'

import type { MotRows } from './mot-aggregate.js'

export type MotData = MotRows & { years: number[] }

const BATCH = 5000

async function insertBatches<T>(rows: T[], insert: (batch: T[]) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) await insert(rows.slice(i, i + BATCH))
}

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** Replaces all `mot_*` tables with `data` in one transaction (the counts are pooled, so partial upserts make no sense). */
export async function saveMot(db: Db, data: MotData): Promise<void> {
  await db.transaction(tx => replaceAll(tx, data))
}

async function replaceAll(tx: Tx, data: MotData): Promise<void> {
  await tx.delete(motMeta)
  await tx.delete(motReasons)
  await tx.delete(motBaseline)
  await tx.delete(motIssues)
  await tx.delete(motStats)
  await tx.delete(motKeys)
  await insertBatches(data.keys, b => tx.insert(motKeys).values(b))
  await insertBatches(data.stats, b => tx.insert(motStats).values(b))
  await insertBatches(data.issues, b => tx.insert(motIssues).values(b))
  await insertBatches(data.baseline, b => tx.insert(motBaseline).values(b))
  await insertBatches(data.reasons, b => tx.insert(motReasons).values(b.map(r => ({ ...r, groupCode: r.group }))))
  const years = [...new Set(data.years)].sort((a, b) => a - b)
  await tx.insert(motMeta).values({ yearFrom: years[0]!, yearTo: years.at(-1)!, years })
}

const COLUMNS = [
  'part',
  'kind',
  'make_key',
  'model_key',
  'make',
  'model',
  'model_year',
  'band',
  'tests',
  'fails',
  'advisories',
  'dangerous',
  'code',
  'group_code',
  'item',
  'fail_text',
  'watch_text',
  'groups',
  'reasons',
  'year_from',
  'year_to',
  'years'
] as const
type Rec = Partial<Record<(typeof COLUMNS)[number], string | number>>

/** One wide CSV, a `part` column says which table a line belongs to (a handful of MB gzipped). */
export async function exportMot(db: Db, path: string): Promise<void> {
  const recs: Rec[] = []
  for (const r of await db.select().from(motMeta))
    recs.push({
      part: 'meta',
      year_from: r.yearFrom,
      year_to: r.yearTo,
      years: (r.years ?? yearRange(r.yearFrom, r.yearTo)).join(' ')
    })
  for (const r of await db.select().from(motKeys).orderBy(motKeys.kind, motKeys.makeKey, motKeys.modelKey))
    recs.push({
      part: 'key',
      kind: r.kind,
      make_key: r.makeKey,
      model_key: r.modelKey,
      make: r.make,
      model: r.model,
      tests: r.tests
    })
  for (const r of await db
    .select()
    .from(motStats)
    .orderBy(motStats.kind, motStats.makeKey, motStats.modelKey, motStats.modelYear, motStats.band))
    recs.push({
      part: 'stat',
      kind: r.kind,
      make_key: r.makeKey,
      model_key: r.modelKey,
      model_year: r.modelYear,
      band: r.band,
      tests: r.tests,
      fails: r.fails,
      advisories: r.advisories
    })
  for (const r of await db
    .select()
    .from(motIssues)
    .orderBy(motIssues.kind, motIssues.makeKey, motIssues.modelKey, motIssues.band))
    recs.push({
      part: 'issue',
      kind: r.kind,
      make_key: r.makeKey,
      model_key: r.modelKey,
      band: r.band,
      tests: r.tests,
      dangerous: r.dangerous,
      groups: JSON.stringify(r.groups),
      reasons: JSON.stringify(r.reasons)
    })
  for (const r of await db.select().from(motBaseline).orderBy(motBaseline.kind, motBaseline.band))
    recs.push({
      part: 'baseline',
      kind: r.kind,
      band: r.band,
      tests: r.tests,
      fails: r.fails,
      advisories: r.advisories,
      dangerous: r.dangerous,
      groups: JSON.stringify(r.groups)
    })
  for (const r of await db.select().from(motReasons).orderBy(motReasons.code))
    recs.push({
      part: 'reason',
      code: r.code,
      group_code: r.groupCode,
      item: r.item,
      fail_text: r.failText,
      watch_text: r.watchText
    })

  const csv = stringifyCsv(recs, { header: true, columns: [...COLUMNS] })
  const out = path.endsWith('.gz') ? gzipSync(csv, { level: 9 }) : Buffer.from(csv)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, out)
  console.log(`exported ${recs.length} line(s) to ${path} (${(out.length / 1024 / 1024).toFixed(2)} MB)`)
}

export async function importMot(db: Db, path: string): Promise<void> {
  const raw = await readFile(path)
  const text = raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw).toString('utf8') : raw.toString('utf8')
  const recs = parseCsv(text, { columns: true }) as Record<string, string>[]
  const data: MotData = { stats: [], issues: [], baseline: [], keys: [], reasons: [], diagnostics: {}, years: [] }
  const int = (v: string | undefined): number => Number(v ?? 0)
  for (const r of recs) {
    const kind = r.kind as MotKind
    if (r.part === 'meta')
      // `years` is missing in exports from before merged years (then the range is contiguous)
      data.years = r.years ? r.years.split(' ').map(Number) : yearRange(int(r.year_from), int(r.year_to))
    else if (r.part === 'key')
      data.keys.push({
        kind,
        makeKey: r.make_key!,
        modelKey: r.model_key!,
        make: r.make!,
        model: r.model!,
        tests: int(r.tests)
      })
    else if (r.part === 'stat')
      data.stats.push({
        kind,
        makeKey: r.make_key!,
        modelKey: r.model_key!,
        modelYear: int(r.model_year),
        band: int(r.band),
        tests: int(r.tests),
        fails: int(r.fails),
        advisories: int(r.advisories)
      })
    else if (r.part === 'issue')
      data.issues.push({
        kind,
        makeKey: r.make_key!,
        modelKey: r.model_key!,
        band: int(r.band),
        tests: int(r.tests),
        dangerous: int(r.dangerous),
        groups: JSON.parse(r.groups!) as MotCounts,
        reasons: JSON.parse(r.reasons!) as MotCounts
      })
    else if (r.part === 'baseline')
      data.baseline.push({
        kind,
        band: int(r.band),
        tests: int(r.tests),
        fails: int(r.fails),
        advisories: int(r.advisories),
        dangerous: int(r.dangerous),
        groups: JSON.parse(r.groups!) as MotCounts
      })
    else if (r.part === 'reason')
      data.reasons.push({
        code: r.code!,
        group: r.group_code!,
        item: r.item!,
        failText: r.fail_text!,
        watchText: r.watch_text!
      })
  }
  if (data.years.length === 0) throw new Error(`${path}: no meta line`)
  await saveMot(db, data)
  console.log(
    `loaded ${data.keys.length} models, ${data.stats.length} stat cells, ${data.issues.length} issue rows from ${path}`
  )
}

const yearRange = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i)

const addCounts = (a: MotCounts, b: MotCounts): MotCounts => {
  const out: MotCounts = { ...a }
  for (const [k, [f, w]] of Object.entries(b)) {
    const [f0, w0] = out[k] ?? [0, 0]
    out[k] = [f0 + f, w0 + w]
  }
  return out
}

/**
 * Pools two aggregates: every count is a plain sum, so a year loaded later just adds on. Known approximation: `issues.reasons`
 * holds only each model's top reasons per run, so a reason in one run's top list but not the other's is under-counted (group
 * counts stay exact). Names of existing models / reasons win over the new run's.
 */
export function mergeMotData(a: MotData, b: MotData): MotData {
  const sumInto = <T extends { tests: number }>(
    rows: T[],
    more: T[],
    key: (r: T) => string,
    add: (x: T, y: T) => T
  ): T[] => {
    const map = new Map(rows.map(r => [key(r), r]))
    for (const r of more) {
      const have = map.get(key(r))
      map.set(key(r), have ? add(have, r) : r)
    }
    return [...map.values()]
  }
  const mk = (r: { kind: string; makeKey: string; modelKey: string }): string => `${r.kind}|${r.makeKey}|${r.modelKey}`
  return {
    keys: sumInto(a.keys, b.keys, mk, (x, y) => ({ ...x, tests: x.tests + y.tests })),
    stats: sumInto(
      a.stats,
      b.stats,
      r => `${mk(r)}|${r.modelYear}|${r.band}`,
      (x, y) => ({ ...x, tests: x.tests + y.tests, fails: x.fails + y.fails, advisories: x.advisories + y.advisories })
    ),
    issues: sumInto(
      a.issues,
      b.issues,
      r => `${mk(r)}|${r.band}`,
      (x, y) => ({
        ...x,
        tests: x.tests + y.tests,
        dangerous: x.dangerous + y.dangerous,
        groups: addCounts(x.groups, y.groups),
        reasons: addCounts(x.reasons, y.reasons)
      })
    ),
    baseline: sumInto(
      a.baseline,
      b.baseline,
      r => `${r.kind}|${r.band}`,
      (x, y) => ({
        ...x,
        tests: x.tests + y.tests,
        fails: x.fails + y.fails,
        advisories: x.advisories + y.advisories,
        dangerous: x.dangerous + y.dangerous,
        groups: addCounts(x.groups, y.groups)
      })
    ),
    reasons: [...new Map([...b.reasons, ...a.reasons].map(r => [r.code, r])).values()],
    diagnostics: {},
    years: [...a.years, ...b.years].sort((x, y) => x - y)
  }
}

/** The tables as one `MotData` (the years come from `mot_meta.years`). */
async function readMot(tx: Tx): Promise<MotData> {
  const [meta] = await tx.select().from(motMeta)
  if (!meta) throw new Error('mot_meta is empty: nothing to merge into (run a full ingest first)')
  return {
    years: meta.years ?? yearRange(meta.yearFrom, meta.yearTo),
    keys: await tx.select().from(motKeys),
    stats: await tx.select().from(motStats),
    issues: await tx.select().from(motIssues),
    baseline: await tx.select().from(motBaseline),
    reasons: (await tx.select().from(motReasons)).map(r => ({
      code: r.code,
      group: r.groupCode,
      item: r.item,
      failText: r.failText,
      watchText: r.watchText
    })),
    diagnostics: {}
  } as MotData
}

/** Adds `data` (years not loaded yet) onto the tables in one transaction; refuses a year that is already pooled. */
export async function mergeMot(db: Db, data: MotData): Promise<MotData> {
  return db.transaction(async tx => {
    const have = await readMot(tx)
    const twice = data.years.filter(y => have.years.includes(y))
    if (twice.length > 0)
      throw new Error(`year(s) ${twice.join(', ')} are already pooled in the DB (${have.years.join(', ')})`)
    const merged = mergeMotData(have, data)
    await replaceAll(tx, merged)
    return merged
  })
}
