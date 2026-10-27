// Plate-recall eval for the running ALPR container (pnpm alpr:up).
// node services/alpr/eval.mjs            → runs eval/images/*, writes eval/results.json,
//                                          and, if eval/labels.csv exists, prints recall/accuracy.
// node services/alpr/eval.mjs --shrink  → same, but each photo is first re-encoded like the web app's
//                                          shrinkImage (apps/web/src/lib/image.ts), writes results.shrink.json
//                                          and lists reads that differ from results.json.
// labels.csv: `file,plates` — plates separated by `|` (empty = no readable plate).
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { createRequire } from 'node:module'

const SHRINK = process.argv.includes('--shrink')
// Mirrors apps/web/src/lib/image.ts: orient, fit in 3200 px, JPEG q85 stepping down by .15 until <= 2.5 MB (floor .4).
// SHRINK_MAX / SHRINK_Q override the web defaults to try other settings.
const MAX_DIMENSION = Number(process.env.SHRINK_MAX ?? 3200)
const START_QUALITY = Number(process.env.SHRINK_Q ?? 85)
const TARGET_BYTES = 2_500_000
const sharp = SHRINK ? createRequire(new URL('../../scripts/package.json', import.meta.url))('sharp') : null
async function shrink(buf) {
  try {
    return await shrinkJpeg(buf)
  } catch {
    return buf // sharp can't decode it (e.g. BMP); shrinkImage would re-encode, this keeps the original
  }
}
async function shrinkJpeg(buf) {
  let quality = START_QUALITY
  let out
  do {
    out = await sharp(buf)
      .rotate()
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer()
    quality -= 15
  } while (out.length > TARGET_BYTES && quality >= 40)
  return out
}

const URL_ = process.env.ALPR_LOCAL_URL ?? 'http://localhost:8088'
const DIR = new URL('./eval/', import.meta.url)
const dir = decodeURIComponent(DIR.pathname.replace(/^\/([A-Za-z]:)/, '$1'))

const norm = s => s.toUpperCase().replace(/[^A-Z0-9]/g, '')
const files = (await readdir(join(dir, 'images'))).sort()
const results = {}
for (const f of files) {
  const form = new FormData()
  form.append(
    'image',
    new Blob([SHRINK ? await shrink(await readFile(join(dir, 'images', f))) : await readFile(join(dir, 'images', f))]),
    f
  )
  const t = Date.now()
  try {
    const res = await fetch(`${URL_}/recognize`, { method: 'POST', body: form })
    const json = await res.json()
    results[f] = {
      ms: Date.now() - t,
      plates: (json.results ?? []).map(r => ({ plate: r.plate, score: +r.score.toFixed(3) }))
    }
  } catch (e) {
    results[f] = { error: String(e), plates: [] }
  }
  console.log(f, results[f].plates.map(p => `${p.plate}(${p.score})`).join(' ') || '—')
}
await writeFile(join(dir, SHRINK ? 'results.shrink.json' : 'results.json'), JSON.stringify(results, null, 1))
if (SHRINK && existsSync(join(dir, 'results.json'))) {
  const orig = JSON.parse(await readFile(join(dir, 'results.json'), 'utf8'))
  const top = r => (r?.plates ?? []).map(p => p.plate).join(' ')
  console.log('\nreads that differ from the original files:')
  let lost = 0
  for (const f of files)
    for (const p of orig[f]?.plates ?? [])
      if (p.score >= 0.9 && !results[f].plates.some(q => q.plate === p.plate)) lost++
  console.log(
    `(max ${MAX_DIMENSION}, q${START_QUALITY}) confident original reads (score >= 0.9) lost after shrink: ${lost}`
  )
  for (const f of files)
    if (top(orig[f]) !== top(results[f])) console.log(`${f}: ${top(orig[f]) || '—'}  =>  ${top(results[f]) || '—'}`)
}

const labelsPath = join(dir, 'labels.csv')
if (existsSync(labelsPath)) {
  let labelled = 0,
    found = 0,
    falsePos = 0
  const misses = []
  for (const line of (await readFile(labelsPath, 'utf8')).split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue
    const [file, plates = ''] = line.split(',')
    const want = plates.split('|').map(norm).filter(Boolean)
    const got = (results[file]?.plates ?? []).map(p => norm(p.plate))
    labelled += want.length
    for (const w of want) got.includes(w) ? found++ : misses.push(`${file}: want ${w}, got [${got}]`)
    falsePos += got.filter(g => !want.includes(g)).length
  }
  console.log(
    `\nrecall (exact) ${found}/${labelled} = ${((found / labelled) * 100).toFixed(1)}%  extra reads: ${falsePos}`
  )
  console.log(misses.join('\n'))
}
