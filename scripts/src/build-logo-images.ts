/**
 * One-off asset build: apps/web/assets-src/kind/logos/<slug>.png (full-size originals, not shipped) →
 * apps/web/public/logos/<slug>.webp (longest side capped at MAX_SIDE, ~1x the 672px watermark).
 * WebP only, never AVIF: lossy AVIF smears the flat white background into an off-white fringe that
 * `mix-blend-multiply` (BrandLogo) turns into a visible ghost box. Re-run (`pnpm build:logo-images`)
 * only when an original changes; `.svg` logos are served from public/ as-is.
 */
import { mkdir, readdir, stat } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const SRC_DIR = new URL('../../apps/web/assets-src/kind/logos/', import.meta.url)
const OUT_DIR = new URL('../../apps/web/public/logos/', import.meta.url)
const MAX_SIDE = 700

await mkdir(OUT_DIR, { recursive: true })

let before = 0
let after = 0
for (const file of (await readdir(SRC_DIR)).filter(f => /\.png$/i.test(f))) {
  const slug = basename(file, extname(file))
  const src = fileURLToPath(new URL(file, SRC_DIR))
  const meta = await sharp(src).metadata()
  const out = await sharp(src)
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 75, alphaQuality: 60, effort: 6 })
    .toFile(fileURLToPath(new URL(`${slug}.webp`, OUT_DIR)))
  const srcSize = (await stat(src)).size
  before += srcSize
  after += out.size
  console.log(
    `${slug}  ${meta.width}x${meta.height} → ${out.width}x${out.height}  ${(srcSize / 1024).toFixed(0)} → ${(out.size / 1024).toFixed(0)} KB`
  )
}
console.log(`total ${(before / 1048576).toFixed(2)} MB → ${(after / 1048576).toFixed(2)} MB`)
