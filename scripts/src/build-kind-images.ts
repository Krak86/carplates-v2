/**
 * One-off asset build: apps/web/assets-src/kind/<n>.<kind>.jpg (full-size originals, not shipped) →
 * apps/web/public/kind/<kind>.{avif,webp} (the grey "no photo" hero placeholders, ~2x the 672px card).
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
  const base = sharp(fileURLToPath(new URL(file, SRC_DIR)))
    .resize({ width: WIDTH, withoutEnlargement: true })
    .grayscale()
    .modulate({ brightness: 0.9 })
  // AVIF first, WebP as the <picture> fallback for browsers without AVIF.
  const avif = await base
    .clone()
    .avif({ quality: 50 })
    .toFile(fileURLToPath(new URL(`${kind}.avif`, OUT_DIR)))
  const webp = await base
    .clone()
    .webp({ quality: 66 })
    .toFile(fileURLToPath(new URL(`${kind}.webp`, OUT_DIR)))
  console.log(
    `${kind}  ${avif.width}x${avif.height}  avif ${(avif.size / 1024).toFixed(0)} KB  webp ${(webp.size / 1024).toFixed(0)} KB`
  )
}
