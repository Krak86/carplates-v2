// Face-blur eval for the running ALPR container (pnpm alpr:up). Do not use the app while it runs (latency numbers).
// node services/alpr/eval-faces.mjs [dir]   → POSTs every photo of eval/faces/ (or `dir`) to /anonymize,
//                                              writes the blurred JPEGs to eval/faces-out/ and eval/faces-results.json,
//                                              and, if <dir>/faces.csv exists, prints recall.
// faces.csv: `file,faces,missed` — faces = people visible whose face a human could recognise, missed = how many of
//   them are still recognisable in the output (count by eye in eval/faces-out/). recall = 1 - missed / faces.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const URL_ = process.env.ALPR_LOCAL_URL ?? 'http://localhost:8088'
const evalDir = decodeURIComponent(new URL('./eval/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const dir = process.argv[2] ?? join(evalDir, 'faces')
const outDir = join(evalDir, 'faces-out')
await mkdir(outDir, { recursive: true })

const files = (await readdir(dir)).filter(f => /\.(jpe?g|png|webp|bmp)$/i.test(f)).sort()
const results = {}
for (const f of files) {
  const form = new FormData()
  form.append('image', new Blob([await readFile(join(dir, f))]), f)
  const t = Date.now()
  try {
    const res = await fetch(`${URL_}/anonymize`, { method: 'POST', body: form })
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
    const jpeg = Buffer.from(await res.arrayBuffer())
    await writeFile(join(outDir, `${f.replace(/\.[^.]+$/, '')}.jpg`), jpeg)
    results[f] = { ms: Date.now() - t, faces: Number(res.headers.get('x-faces-blurred')), bytes: jpeg.length }
  } catch (e) {
    results[f] = { error: String(e) }
  }
  console.log(f, JSON.stringify(results[f]))
}
await writeFile(join(evalDir, 'faces-results.json'), JSON.stringify(results, null, 1))

const ms = Object.values(results)
  .map(r => r.ms)
  .filter(Boolean)
  .sort((a, b) => a - b)
if (ms.length) console.log(`\n${ms.length} photos, median ${ms[ms.length >> 1]} ms, max ${ms.at(-1)} ms`)

const csv = join(dir, 'faces.csv')
if (existsSync(csv)) {
  let faces = 0,
    detected = 0,
    missed = 0
  for (const line of (await readFile(csv, 'utf8')).split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue
    const [file, n, m = '0'] = line.split(',')
    faces += Number(n)
    missed += Number(m)
    detected += results[file]?.faces ?? 0
  }
  console.log(
    `faces ${faces}, still recognisable ${missed}, recall ${(((faces - missed) / faces) * 100).toFixed(1)}%  (detector boxes: ${detected})`
  )
}
