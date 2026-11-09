/**
 * Candidate-photo scan (docs/wiki-recolor-plan.md, step 7): extra Commons photos per model for the colour-matched hero and the photo strip.
 *
 *   pnpm ingest:wiki-candidates --limit 5 --dry-run
 *   pnpm ingest:wiki-candidates --brand kia --model ceed --rps 1
 *
 * For each model (most-registered first) not yet searched at this `algo`: one Commons search (up to 40 hits, no year), keep the
 * whole-car landscape jpegs at least 1000 px wide (wiki-candidates-core.ts), download the best `--per-model`, run the same SegFormer
 * paint scan as wiki-paint.ts (bucket + Lab, NO mask stored) and replace the model's rows in `registry.wiki_image_candidate`.
 * The model is recorded in `wiki_image_candidate_scan` even when nothing qualified, so a rerun resumes.
 *
 *   --limit N       models to scan (default 5)
 *   --brand X / --model X   only these normalized names (repeatable; combine like wiki-paint.ts)
 *   --per-model N   photos analysed per model (default 20, max 40)
 *   --rps N         requests per second to Wikimedia (default 1, max 2)
 *   --dry-run       scan and print without writing to the DB
 */
import { parseArgs } from 'node:util'

import { createDb, schema, type Db, type WikiImageCandidateInsert } from '@carplates/db'
import {
  CANDIDATE_SEARCH_LIMIT,
  commonsCandidatesSearchUrl,
  commonsPagesInOrder,
  fetchWikimediaJson,
  wikiSearchName,
  type CommonsPages
} from '@carplates/shared'
import { and, eq, sql, type SQL } from 'drizzle-orm'

import { candidateQuality, qualifyingCandidates, type Candidate } from './wiki-candidates-core.js'
import { PAINT_ALGO } from './wiki-paint-core.js'
import { PAINT_USER_AGENT, loadSegmenter, scanImage, type Segmenter } from './wiki-paint-image.js'
import { normalizeScope } from './wiki-paint-scope.js'

const log = (...m: unknown[]): void => {
  console.log(...m)
}
const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms))

type ModelKey = { brand: string; model: string }

/** Models never searched, or searched with an older algorithm, most registrations first. Keys are lower-cased like `wiki_image`. */
async function pickModels(db: Db, brands: string[], models: string[], limit: number): Promise<ModelKey[]> {
  const inList = (col: SQL, values: string[]): SQL =>
    values.length
      ? sql`AND ${col} IN (${sql.join(
          values.map(v => sql`${v}`),
          sql`, `
        )})`
      : sql``
  const { rows } = await db.execute<ModelKey>(sql`
    SELECT p.brand, p.model FROM (
      SELECT lower(brand) AS brand, lower(model) AS model, sum(total_rows) AS n
      FROM registry.stats_by_model GROUP BY 1, 2
    ) p
    LEFT JOIN registry.wiki_image_candidate_scan s ON s.brand = p.brand AND s.model = p.model
    WHERE (s.brand IS NULL OR s.algo < ${PAINT_ALGO})
      ${inList(sql.raw('p.brand'), brands)} ${inList(sql.raw('p.model'), models)}
    ORDER BY p.n DESC NULLS LAST, p.brand, p.model
    LIMIT ${limit}
  `)
  return rows
}

async function analyse(
  seg: Segmenter,
  key: ModelKey,
  c: Candidate,
  rps: number
): Promise<WikiImageCandidateInsert | null> {
  const res = await fetch(c.imageUrl, { headers: { 'User-Agent': PAINT_USER_AGENT } })
  await sleep(1000 / rps)
  if (!res.ok) return null
  const { scan } = await scanImage(seg, Buffer.from(await res.arrayBuffer()))
  const base = {
    ...key,
    title: c.title,
    imageUrl: c.imageUrl,
    imageWidth: c.width,
    imageHeight: c.height,
    photoYear: c.photoYear,
    attrAuthor: c.author,
    attrLicense: c.license,
    attrLicenseUrl: c.licenseUrl,
    algo: PAINT_ALGO
  }
  return scan.status === 'ok'
    ? {
        ...base,
        status: 'ok',
        skipReason: null,
        bucket: scan.bucket,
        labL: scan.lab[0],
        labA: scan.lab[1],
        labB: scan.lab[2],
        bodyArea: scan.bodyArea,
        quality: candidateQuality(c.titleScore, scan.bodyArea)
      }
    : {
        ...base,
        status: 'skip',
        skipReason: scan.reason,
        bucket: null,
        labL: null,
        labA: null,
        labB: null,
        bodyArea: scan.bodyArea,
        quality: candidateQuality(c.titleScore, scan.bodyArea)
      }
}

/** Replaces the model's candidate rows and records the scan in one transaction. */
async function saveModel(db: Db, key: ModelKey, rows: WikiImageCandidateInsert[]): Promise<void> {
  await db.transaction(async tx => {
    await tx
      .delete(schema.wikiImageCandidate)
      .where(and(eq(schema.wikiImageCandidate.brand, key.brand), eq(schema.wikiImageCandidate.model, key.model)))
    if (rows.length) await tx.insert(schema.wikiImageCandidate).values(rows)
    const scanRow = { ...key, found: rows.length, algo: PAINT_ALGO }
    await tx
      .insert(schema.wikiImageCandidateScan)
      .values(scanRow)
      .onConflictDoUpdate({
        target: [schema.wikiImageCandidateScan.brand, schema.wikiImageCandidateScan.model],
        set: { ...scanRow, scannedAt: sql`now()` }
      })
  })
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      limit: { type: 'string', default: '5' },
      brand: { type: 'string', multiple: true, default: [] },
      model: { type: 'string', multiple: true, default: [] },
      'per-model': { type: 'string', default: '20' },
      rps: { type: 'string', default: '1' },
      'dry-run': { type: 'boolean', default: false }
    },
    strict: true
  })
  const limit = Math.max(1, Number(values.limit) || 5)
  const perModel = Math.min(CANDIDATE_SEARCH_LIMIT, Math.max(1, Number(values['per-model']) || 20))
  const rps = Math.min(2, Math.max(0.1, Number(values.rps) || 1))
  const dryRun = values['dry-run']

  const { db, close } = createDb()
  const keys = await pickModels(db, normalizeScope(values.brand), normalizeScope(values.model), limit)
  log(`scanning ${keys.length} model(s), algo ${PAINT_ALGO}${dryRun ? ' (dry run, nothing saved)' : ''}`)
  const seg = await loadSegmenter()

  const startedAt = Date.now()
  const buckets = new Map<string, number>()
  for (const key of keys) {
    try {
      const alias = wikiSearchName(key.brand, key.model)
      const searchModel = alias?.model ?? key.model
      const payload = await fetchWikimediaJson<CommonsPages>(
        commonsCandidatesSearchUrl(alias?.brand ?? key.brand, searchModel),
        { userAgent: PAINT_USER_AGENT, timeoutMs: 20_000, sleep, beforeRequest: () => sleep(1000 / rps) }
      )
      const qualified = qualifyingCandidates(commonsPagesInOrder(payload), searchModel)
      const rows: WikiImageCandidateInsert[] = []
      for (const c of qualified.slice(0, perModel)) {
        try {
          const row = await analyse(seg, key, c, rps)
          if (row) rows.push(row)
        } catch (e) {
          log(`  ${c.title}: ${(e as Error).message}`)
        }
      }
      const ok = rows.filter(r => r.status === 'ok')
      for (const r of ok) buckets.set(r.bucket ?? '?', (buckets.get(r.bucket ?? '?') ?? 0) + 1)
      log(
        `${key.brand} ${key.model}: ${qualified.length} qualified, ${rows.length} analysed, ${ok.length} ok (${[...new Set(ok.map(r => r.bucket))].join(', ')})`
      )
      if (!dryRun) await saveModel(db, key, rows)
    } catch (e) {
      // A failed search is not recorded as scanned: the model is retried on the next run.
      log(`${key.brand} ${key.model}: ERROR ${(e as Error).message}`)
    }
  }
  log('\nsummary: ok photos per colour')
  for (const [k, v] of [...buckets].sort((a, b) => b[1] - a[1])) log(`  ${String(v).padStart(3)}  ${k}`)
  log(`  took ${((Date.now() - startedAt) / 60_000).toFixed(1)} min for ${keys.length} model(s)`)
  await close()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
