// Downloads the ZAKON typeface (free for use, mincult.gov.ua/zakon) into the git-ignored apps/web/public/fonts/zakon/.
// Run: pnpm fetch:zakon-font   (idempotent; --force re-downloads)
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = 'https://mincult.gov.ua/zakon/assets/fonts/'
const FILES = ['Zakon-Regular.otf', 'Zakon-Bold.otf'] as const
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../apps/web/public/fonts/zakon')
const force = process.argv.includes('--force')

await mkdir(OUT_DIR, { recursive: true })
for (const name of FILES) {
  const dest = path.join(OUT_DIR, name)
  if (
    !force &&
    (await stat(dest).then(
      () => true,
      () => false
    ))
  ) {
    console.log(`skip ${name} (exists)`)
    continue
  }
  const res = await fetch(BASE + name)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  // OpenType-CFF magic: "OTTO"; guards against an HTML error page saved as a font.
  if (buf.subarray(0, 4).toString('latin1') !== 'OTTO') throw new Error(`${name}: not an OpenType font`)
  await writeFile(dest, buf)
  console.log(`saved ${name} (${buf.length} bytes)`)
}
