// Plate-recall eval for the running ALPR container (pnpm alpr:up).
// node services/alpr/eval.mjs            → runs eval/images/*, writes eval/results.json,
//                                          and, if eval/labels.csv exists, prints recall/accuracy.
// labels.csv: `file,plates` — plates separated by `|` (empty = no readable plate).
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'

const URL_ = process.env.ALPR_LOCAL_URL ?? 'http://localhost:8088'
const DIR = new URL('./eval/', import.meta.url)
const dir = decodeURIComponent(DIR.pathname.replace(/^\/([A-Za-z]:)/, '$1'))

const norm = s => s.toUpperCase().replace(/[^A-Z0-9]/g, '')
const files = (await readdir(join(dir, 'images'))).sort()
const results = {}
for (const f of files) {
  const form = new FormData()
  form.append('image', new Blob([await readFile(join(dir, 'images', f))]), f)
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
await writeFile(join(dir, 'results.json'), JSON.stringify(results, null, 1))

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
