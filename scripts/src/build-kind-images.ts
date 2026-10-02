/**
 * One-off asset build: apps/web/assets-src/kind/<n>.<kind>.jpg (full-size originals, not shipped) →
 * apps/web/public/kind/<kind>.webp (the grey "no photo" hero placeholders, ~2x the 672px card).
 * Re-run (`pnpm build:kind-images`) only when an original changes.
 */
import { mkdir, readdir } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const SRC_DIR = new URL('../../apps/web/assets-src/kind/', import.meta.url)
const OUT_DIR = new URL('../../apps/web/public/kind/', import.meta.url)
const WIDTH = 1280

await mkdir(OUT_DIR, { recursive: true })

for (const file of (await readdir(SRC_DIR)).filter(f => /\.jpe?g$/i.test(f))) {
  // "11.specialized.jpg" → "specialized"
  const kind = basename(file, extname(file)).replace(/^\d+\./, '')
  const out = new URL(`${kind}.webp`, OUT_DIR)
  const info = await sharp(fileURLToPath(new URL(file, SRC_DIR)))
    .resize({ width: WIDTH, withoutEnlargement: true })
    .grayscale()
    .modulate({ brightness: 0.9 })
    .webp({ quality: 66 })
    .toFile(fileURLToPath(out))
  console.log(`${kind}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`)
}
