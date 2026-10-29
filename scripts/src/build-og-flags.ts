import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

import sharp from 'sharp'

// Region flags for the /og link-preview card: resvg cannot decode WebP, so the 480 px WebP flags become 180 px PNGs.
// Re-run after adding a region flag: `pnpm --filter scripts build:og-flags`.
const WEB = resolve(import.meta.dirname, '../../apps/web')
const SRC = join(WEB, 'src/assets/flags-lg')
const OUT = join(WEB, 'public/og-flags')

for (const file of readdirSync(SRC).filter(f => f.endsWith('.webp'))) {
  const id = file.replace(/^flaglg-/, '').replace(/\.webp$/, '')
  await sharp(join(SRC, file))
    .resize({ width: 180 })
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, `${id}.png`))
}
console.log(`wrote ${readdirSync(OUT).length} flags to ${OUT}`)
