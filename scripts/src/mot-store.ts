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

/** Replaces all `mot_*` tables with `data` in one transaction (the counts are pooled, so partial upserts make no sense). */
export async function saveMot(db: Db, data: MotData): Promise<void> {
  await db.transaction(async tx => {
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
    await tx.insert(motMeta).values({ yearFrom: Math.min(...data.years), yearTo: Math.max(...data.years) })
  })
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
  'year_to'
] as const
type Rec = Partial<Record<(typeof COLUMNS)[number], string | number>>

/** One wide CSV, a `part` column says which table a line belongs to (a handful of MB gzipped). */
export async function exportMot(db: Db, path: string): Promise<void> {
  const recs: Rec[] = []
  for (const r of await db.select().from(motMeta)) recs.push({ part: 'meta', year_from: r.yearFrom, year_to: r.yearTo })
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
    if (r.part === 'meta') data.years = [int(r.year_from), int(r.year_to)]
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
