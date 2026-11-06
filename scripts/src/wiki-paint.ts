/**
 * Paint scan of the Wikimedia hero photos for the colour filter (docs/wiki-recolor-plan.md, step 2).
 *
 *   pnpm ingest:wiki-paint --limit 30 --order random --out .data/wiki-paint/sample   # a sample, with previews
 *   pnpm ingest:wiki-paint --brand kia --limit 50 --rps 1
 *
 * Reads distinct `registry.wiki_image.image_url` of `status = 'ok'` rows (read-only), downloads each thumbnail at 640 px,
 * runs SegFormer (ADE20K, `car` class) and `scanPaint` (wiki-paint-core.ts), and upserts the result (skip rows too) into
 * `registry.wiki_image_paint`. Only photos never scanned or scanned with `algo` < PAINT_ALGO are picked, so a rerun resumes.
 * With `--out DIR` it also writes `results.json` (+ the mask webp and a recolour preview per photo) for review by eye.
 *
 *   --limit N     photos to scan (default 30)
 *   --brand X     only this normalized brand (repeatable)
 *   --order O     popular (default: most-registered models first) | url | random
 *   --keep-orphans  do not delete wiki_image_paint rows no ok wiki_image row uses any more (default: deleted after the scan)
 *   --rps N       downloads per second (default 1, max 2)
 *   --out DIR     write results.json, masks, previews and contact sheets (sheet-N.jpg) here
 *   --dry-run     scan without writing to the DB
 *   --preview C   colour used for the preview recolour (default red)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

import { createDb, schema, type Db, type WikiImagePaintInsert } from '@carplates/db'
import { VEHICLE_COLORS, isClosePaint, type VehicleColor } from '@carplates/shared'
import { env, pipeline, RawImage } from '@huggingface/transformers'
import { sql } from 'drizzle-orm'
import sharp from 'sharp'

import { writeContactSheets, type SheetEntry } from './wiki-paint-sheet.js'
import { PAINT_ALGO, PAINT_SCAN_WIDTH, applyPaint, scanPaint } from './wiki-paint-core.js'
import type { PaintScanResult } from './wiki-paint-core.js'

const DATA_DIR = join(import.meta.dirname, '..', '.data', 'wiki-paint')
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
/** Mask encoding: ~28 KB per photo at 640 px (quality 80 was ~62 KB; error vs it about 2 of 255). Encoding only, the scan algorithm is unchanged. */
const MASK_WEBP = { quality: 50, alphaQuality: 60, effort: 6 } as const
const MODEL = 'Xenova/segformer-b0-finetuned-ade-512-512'

const log = (...m: unknown[]): void => {
  console.log(...m)
}
const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms))

type Segmenter = (img: RawImage) => Promise<{ label: string; mask: RawImage }[]>

/** Car probability (0-255) at `w x h`, or null when SegFormer found no `car`. */
async function carProbability(seg: Segmenter, rgb: Uint8Array, w: number, h: number): Promise<Uint8Array | null> {
  const out = await seg(new RawImage(Uint8ClampedArray.from(rgb), w, h, 3))
  const car = out.find(o => o.label === 'car')
  if (!car) return null
  const m = car.mask
  const { data, info } = await sharp(Buffer.from(m.data), { raw: { width: m.width, height: m.height, channels: 1 } })
    .resize(w, h, { kernel: 'cubic' })
    .raw()
    .toBuffer({ resolveWithObject: true })
  // sharp can return extra channels for 1-channel input after resize: always stride by info.channels.
  const prob = new Uint8Array(w * h)
  for (let i = 0; i < prob.length; i++) prob[i] = data[i * info.channels]!
  return prob
}

async function scanImage(
  seg: Segmenter,
  buf: Buffer
): Promise<{ rgb: Uint8Array; w: number; h: number; scan: PaintScanResult }> {
  const { data, info } = await sharp(buf)
    .resize({ width: PAINT_SCAN_WIDTH })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const rgb = new Uint8Array(data)
  const prob = await carProbability(seg, rgb, info.width, info.height)
  const scan: PaintScanResult = prob
    ? scanPaint({ rgb, width: info.width, height: info.height, prob })
    : { status: 'skip', reason: 'no_car', bodyArea: null }
  return { rgb, w: info.width, h: info.height, scan }
}

/** Upsert one scan (skip rows too). The mask is an RGBA webp at the scan size, per the contract in the plan's Handoff. */
async function savePaint(db: Db, url: string, w: number, h: number, scan: PaintScanResult): Promise<number> {
  const mask =
    scan.status === 'ok'
      ? await sharp(scan.mask, { raw: { width: w, height: h, channels: 4 } })
          .webp(MASK_WEBP)
          .toBuffer()
      : null
  const row: WikiImagePaintInsert =
    scan.status === 'ok'
      ? {
          imageUrl: url,
          status: 'ok',
          skipReason: null,
          bucket: scan.bucket,
          labL: scan.lab[0],
          labA: scan.lab[1],
          labB: scan.lab[2],
          bodyArea: scan.bodyArea,
          maskW: w,
          maskH: h,
          mask,
          algo: PAINT_ALGO
        }
      : {
          imageUrl: url,
          status: 'skip',
          skipReason: scan.reason,
          bucket: null,
          labL: null,
          labA: null,
          labB: null,
          bodyArea: scan.bodyArea,
          maskW: null,
          maskH: null,
          mask: null,
          algo: PAINT_ALGO
        }
  await db
    .insert(schema.wikiImagePaint)
    .values(row)
    .onConflictDoUpdate({
      target: schema.wikiImagePaint.imageUrl,
      set: { ...row, scannedAt: sql`now()` }
    })
  return mask?.length ?? 0
}

/** Scan order: `popular` = the photos of the models with the most registry rows first (the default), `url` = stable, `random`. */
const ORDERS = ['popular', 'url', 'random'] as const
type Order = (typeof ORDERS)[number]

/**
 * Distinct `ok` photo files never scanned or scanned with an older algorithm (`algo` < PAINT_ALGO).
 * `popular`: a file's weight is the largest `stats_by_model.total_rows` among the models that use it (`wiki_image` keys are
 * lower-cased, `stats_by_model` is not); models without a match (trim noise in the key) come last.
 */
async function pickUrls(db: Db, brands: string[], limit: number, order: Order): Promise<string[]> {
  const brandFilter = brands.length
    ? sql`AND w.brand IN (${sql.join(
        brands.map(b => sql`${b}`),
        sql`, `
      )})`
    : sql``
  const orderBy =
    order === 'random' ? sql`random()` : order === 'url' ? sql`image_url` : sql`weight DESC NULLS LAST, image_url`
  const { rows } = await db.execute<{ image_url: string }>(sql`
    WITH pop AS (
      SELECT lower(brand) AS brand, lower(model) AS model, sum(total_rows) AS n
      FROM registry.stats_by_model GROUP BY 1, 2
    )
    SELECT image_url FROM (
      SELECT w.image_url, max(pop.n) AS weight
      FROM registry.wiki_image w
      LEFT JOIN registry.wiki_image_paint p ON p.image_url = w.image_url
      LEFT JOIN pop ON pop.brand = w.brand AND pop.model = w.model
      WHERE w.status = 'ok' AND w.image_url IS NOT NULL AND (p.image_url IS NULL OR p.algo < ${PAINT_ALGO})
        ${brandFilter}
      GROUP BY w.image_url
    ) u ORDER BY ${orderBy} LIMIT ${limit}
  `)
  return rows.map(r => r.image_url)
}

/**
 * Deletes paint rows whose file no `ok` wiki_image row uses any more (the photo was replaced or dropped), masks included.
 * A table with no `ok` photos at all (fresh or emptied DB) is left alone: that is not an orphan, it is a missing source.
 */
async function deleteOrphans(db: Db): Promise<number> {
  const { rows: ok } = await db.execute<{ n: string }>(
    sql`SELECT count(*)::text AS n FROM registry.wiki_image WHERE status = 'ok'`
  )
  if (!Number(ok[0]?.n ?? 0)) return 0
  const res = await db.execute(sql`
    DELETE FROM registry.wiki_image_paint p
    WHERE NOT EXISTS (
      SELECT 1 FROM registry.wiki_image w WHERE w.image_url = p.image_url AND w.status = 'ok'
    )
  `)
  return res.rowCount ?? 0
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      limit: { type: 'string', default: '30' },
      brand: { type: 'string', multiple: true, default: [] },
      order: { type: 'string', default: 'popular' },
      'keep-orphans': { type: 'boolean', default: false },
      rps: { type: 'string', default: '1' },
      out: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      preview: { type: 'string', default: 'red' }
    },
    strict: true
  })
  const limit = Math.max(1, Number(values.limit) || 30)
  const order = ORDERS.find(o => o === values.order) ?? 'popular'
  const rps = Math.min(2, Math.max(0.1, Number(values.rps) || 1))
  const preview = VEHICLE_COLORS.find(c => c === values.preview) ?? 'red'
  const outDir = values.out ? join(import.meta.dirname, '..', values.out) : null
  if (outDir) mkdirSync(outDir, { recursive: true })

  const dryRun = values['dry-run']
  const { db, close } = createDb()
  const urls = await pickUrls(db, values.brand, limit, order)
  log(`scanning ${urls.length} photo(s), algo ${PAINT_ALGO}${dryRun ? ' (dry run, nothing saved)' : ''}`)
  env.cacheDir = join(DATA_DIR, 'hf-cache')
  const seg = (await pipeline('image-segmentation', MODEL, { dtype: 'q8' })) as unknown as Segmenter

  const startedAt = Date.now()
  const results: Record<string, unknown>[] = []
  const reasons = new Map<string, number>()
  let maskTotal = 0
  for (const [n, url] of urls.entries()) {
    const name = String(n + 1).padStart(3, '0')
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (!res.ok) throw new Error(`http ${res.status}`)
      const { rgb, w, h, scan } = await scanImage(seg, Buffer.from(await res.arrayBuffer()))
      let maskBytes = 0
      if (!dryRun) maskBytes = await savePaint(db, url, w, h, scan)
      maskTotal += maskBytes
      const key = scan.status === 'ok' ? 'ok' : `skip: ${scan.reason}`
      reasons.set(key, (reasons.get(key) ?? 0) + 1)
      if (scan.status === 'ok') {
        const keptForPreview = isClosePaint(scan.lab, preview as VehicleColor)
        log(
          `${name} ok    bucket=${scan.bucket} lab=${scan.lab.map(Math.round).join(',')} area=${scan.bodyArea.toFixed(2)} share=${scan.paintShare.toFixed(2)}${keptForPreview ? ' (close to preview colour)' : ''}`
        )
        results.push({
          name,
          url,
          status: 'ok',
          bucket: scan.bucket,
          lab: scan.lab.map(Math.round),
          bodyArea: +scan.bodyArea.toFixed(3),
          paintShare: +scan.paintShare.toFixed(3)
        })
        if (outDir) {
          await sharp(scan.mask, { raw: { width: w, height: h, channels: 4 } })
            .webp(MASK_WEBP)
            .toFile(join(outDir, `${name}.mask.webp`))
          await sharp(applyPaint(rgb, scan.mask, preview), { raw: { width: w, height: h, channels: 3 } })
            .jpeg({ quality: 82 })
            .toFile(join(outDir, `${name}.${preview}.jpg`))
        }
      } else {
        log(`${name} skip  ${scan.reason}`)
        results.push({
          name,
          url,
          status: 'skip',
          reason: scan.reason,
          bodyArea: scan.bodyArea === null ? null : +scan.bodyArea.toFixed(3)
        })
      }
      if (outDir)
        await sharp(rgb, { raw: { width: w, height: h, channels: 3 } })
          .jpeg({ quality: 82 })
          .toFile(join(outDir, `${name}.orig.jpg`))
    } catch (e) {
      log(`${name} ERROR ${(e as Error).message}`)
      results.push({ name, url, status: 'error', error: (e as Error).message })
    }
    await sleep(1000 / rps)
  }
  log('\nsummary:')
  for (const [k, v] of [...reasons].sort((a, b) => b[1] - a[1])) log(`  ${String(v).padStart(3)}  ${k}`)
  if (!dryRun && maskTotal) log(`  masks saved: ${(maskTotal / 1024).toFixed(0)} KB total`)
  log(`  took ${((Date.now() - startedAt) / 60_000).toFixed(1)} min for ${urls.length} photo(s)`)
  if (outDir) {
    writeFileSync(join(outDir, 'results.json'), JSON.stringify(results, null, 1))
    const sheet: SheetEntry[] = results.map(r => ({
      name: String(r.name),
      status: r.status as SheetEntry['status'],
      note: r.status === 'ok' ? `${String(r.bucket)} area ${String(r.bodyArea)}` : String(r.reason ?? r.error ?? '')
    }))
    log(`  contact sheets: ${(await writeContactSheets(outDir, sheet, preview)).join(', ')}`)
  }
  if (!dryRun && !values['keep-orphans']) log(`  orphan paint rows deleted: ${await deleteOrphans(db)}`)
  await close()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
