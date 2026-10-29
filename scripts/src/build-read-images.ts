/**
 * One-off asset build: apps/web/assets-src/read/<guide>.webp (Fooocus originals, not shipped) →
 * apps/web/public/read/<guide>.{avif,webp} (`/read` hub + article banners; `<guide>` = last segment of the guide path).
 * Re-run (`pnpm build:read-images`) only when an original changes.
 */
import { mkdir, readdir } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const SRC_DIR = new URL('../../apps/web/assets-src/read/', import.meta.url)
const OUT_DIR = new URL('../../apps/web/public/read/', import.meta.url)
const WIDTH = 800

await mkdir(OUT_DIR, { recursive: true })

for (const file of (await readdir(SRC_DIR)).filter(f => /\.(webp|jpe?g|png)$/i.test(f))) {
  const guide = basename(file, extname(file))
  const base = sharp(fileURLToPath(new URL(file, SRC_DIR))).resize({ width: WIDTH, withoutEnlargement: true })
  const avif = await base
    .clone()
    .avif({ quality: 50 })
    .toFile(fileURLToPath(new URL(`${guide}.avif`, OUT_DIR)))
  const webp = await base
    .clone()
    .webp({ quality: 70 })
    .toFile(fileURLToPath(new URL(`${guide}.webp`, OUT_DIR)))
  console.log(
    `${guide}  ${avif.width}x${avif.height}  avif ${(avif.size / 1024).toFixed(0)} KB  webp ${(webp.size / 1024).toFixed(0)} KB`
  )
}
