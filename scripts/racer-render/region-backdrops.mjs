// Builds the per-region racer backdrops (`bg-<id>-sky|ridge.webp`, 1280x480, mirror-tiled) from plain photos with sharp,
// no browser needed (unlike backdrop.html, which colour-keys a sky out of a Carpathian shot).
// Usage: node scripts/racer-render/region-backdrops.mjs <photos dir> <out dir> [id ...]
// Also writes <out dir>/_preview-<id>.png (grass + both layers, as the engine draws them) — delete these before committing.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const W = 1280
const H = 480
const HORIZON = 256

/**
 * sky:   {x0, x1, y0} source fractions of the sky strip (height follows from the 640:HORIZON aspect), or {gradient:[top, bottom]}
 * ridge: {cx, y0, y1, k}: the band y0..y1 (fractions) centred on cx, scaled to `h` px tall and mirror-repeated k times per
 *        640 px (so the 1280 layer wraps seamlessly); `key` colour-keys a blue sky out of the top `keyRows` fraction of the band;
 *        `fade` = px of soft alpha at the top edge.
 */
const PHOTOS = {
  vinnytsia: {
    file: 'Вінниця.jpg',
    sky: { x0: 0, x1: 0.42, y0: 0 },
    ridge: { cx: 0.5, y0: 0.2, y1: 0.9, k: 2, h: 250, key: true, keyRows: 1 }
  },
  crimea: {
    file: 'АРкрим.jpg',
    sky: { x0: 0.45, x1: 0.85, y0: 0 },
    ridge: { cx: 0.32, y0: 0.05, y1: 0.62, k: 2, h: 250, key: true, keyRows: 0.62 }
  },
  sevastopol: {
    file: 'севастополь.webp',
    sky: { x0: 0.35, x1: 0.8, y0: 0 },
    ridge: { cx: 0.5, y0: 0.08, y1: 0.62, k: 2, h: 220, key: true, keyRows: 0.45 }
  },
  zaporizhzhia: {
    file: 'дніпро.jpg',
    sky: { x0: 0, x1: 0.6, y0: 0 },
    ridge: { cx: 0.5, y0: 0.13, y1: 0.62, k: 2, h: 200, fade: 28 }
  },
  zhytomyr: {
    file: 'zhytomyr.jpg',
    sky: { gradient: ['#6f9fd8', '#cfe6f6'] },
    ridge: { cx: 0.5, y0: 0.18, y1: 0.98, k: 2, h: 250, fade: 40 }
  },
  donetsk: {
    file: 'Донецька.jpg',
    sky: { x0: 0.15, x1: 0.65, y0: 0 },
    ridge: { cx: 0.6, y0: 0.05, y1: 0.86, k: 2, h: 250, key: true, keyRows: 0.8 }
  },
  // photos found on Wikimedia Commons (credits: docs/racer-backdrop-credits.md), tuned where the default crop fails
  dnipro: {
    file: 'dnipro.jpg',
    sky: { x0: 0, x1: 0.5, y0: 0 },
    ridge: { cx: 0.5, y0: 0.2, y1: 0.6, k: 2, h: 200, fade: 30 }
  },
  kharkiv: {
    file: 'kharkiv.jpg',
    sky: { x0: 0, x1: 0.5, y0: 0 },
    ridge: { cx: 0.5, y0: 0.15, y1: 0.8, k: 2, h: 250, key: true, keyRows: 0.3 }
  },
  kherson: {
    file: 'kherson.jpg',
    sky: { gradient: ['#8fb4d8', '#dbe8f2'] },
    ridge: { cx: 0.5, y0: 0.05, y1: 0.4, k: 2, h: 160, fade: 20 }
  },
  kirovohrad: {
    file: 'kirovohrad.jpg',
    sky: { x0: 0, x1: 0.5, y0: 0 },
    ridge: { cx: 0.5, y0: 0.3, y1: 0.75, k: 2, h: 250, key: true, keyRows: 0.6 }
  },
  sumy: {
    file: 'sumy.jpg',
    sky: { gradient: ['#6f9fd8', '#cfe6f6'] },
    ridge: { cx: 0.5, y0: 0.2, y1: 0.8, k: 2, h: 250, fade: 30 }
  },
  ternopil: {
    file: 'ternopil.jpg',
    sky: { x0: 0, x1: 0.5, y0: 0 },
    ridge: { cx: 0.5, y0: 0.35, y1: 0.8, k: 2, h: 220, fade: 30 }
  },
  poltava: {
    file: 'poltava.jpg',
    sky: { x0: 0, x1: 0.5, y0: 0 },
    ridge: { cx: 0.5, y0: 0.2, y1: 0.8, k: 2, h: 250, fade: 30 }
  },
  zakarpattia: {
    file: 'zakarpattia.jpg',
    sky: { x0: 0, x1: 0.5, y0: 0 },
    ridge: { cx: 0.5, y0: 0.2, y1: 0.6, k: 2, h: 220, key: true, keyRows: 0.35 }
  },
  mykolaiv: {
    file: 'Mykolaiv.jpg',
    sky: { x0: 0.15, x1: 0.65, y0: 0 },
    ridge: { cx: 0.5, y0: 0.3, y1: 0.76, k: 2, h: 250, key: true, keyRows: 1 }
  },
  volyn: {
    file: 'волинь.webp',
    sky: { gradient: ['#7fa6d4', '#cfe0ee'] },
    ridge: { cx: 0.5, y0: 0.06, y1: 0.55, k: 2, h: 230, fade: 36 }
  }
}

/** Photos without an entry above ( in the photos dir) get these defaults until they are tuned. */
const DEFAULT_CROP = {
  sky: { x0: 0, x1: 0.5, y0: 0 },
  ridge: { cx: 0.5, y0: 0.3, y1: 0.95, k: 2, h: 250, key: true, keyRows: 1 }
}

const [photosDir, outDir, ...only] = process.argv.slice(2)
if (!photosDir || !outDir) throw new Error('usage: region-backdrops.mjs <photosDir> <outDir> [id ...]')

/** A 640-wide strip + its mirror = a 1280 layer that tiles seamlessly; k > 1 repeats a narrower piece inside the strip. */
async function mirrorTile(piece, k) {
  const w = Math.round(640 / k)
  const small = await sharp(piece).resize(w, null, { fit: 'fill' }).png().toBuffer()
  const meta = await sharp(small).metadata()
  const flipped = await sharp(small).flop().png().toBuffer()
  const parts = []
  for (let i = 0; i < k * 2; i++) parts.push({ input: i % 2 ? flipped : small, left: i * w, top: 0 })
  return {
    buf: await sharp({ create: { width: w * k * 2, height: meta.height, channels: 4, background: '#0000' } })
      .composite(parts)
      .resize(W, meta.height, { fit: 'fill' })
      .png()
      .toBuffer(),
    h: meta.height
  }
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

async function buildSky(img, iw, ih, sky) {
  let strip
  if (sky.gradient) {
    const [a, b] = sky.gradient.map(hexToRgb)
    const raw = Buffer.alloc(1 * HORIZON * 4)
    for (let y = 0; y < HORIZON; y++) {
      const t = y / (HORIZON - 1)
      for (let c = 0; c < 3; c++) raw[y * 4 + c] = Math.round(a[c] + (b[c] - a[c]) * t)
      raw[y * 4 + 3] = 255
    }
    strip = await sharp(raw, { raw: { width: 1, height: HORIZON, channels: 4 } })
      .resize(W, HORIZON, { fit: 'fill' })
      .png()
      .toBuffer()
  } else {
    const left = Math.round(sky.x0 * iw)
    const width = Math.round((sky.x1 - sky.x0) * iw)
    const height = Math.min(Math.round(width * (HORIZON / 640)), ih - Math.round(sky.y0 * ih))
    const piece = await img
      .clone()
      .extract({ left, top: Math.round(sky.y0 * ih), width, height })
      .resize(640, Math.round((640 / width) * height), { fit: 'fill' })
      .png()
      .toBuffer()
    const { buf, h } = await mirrorTile(piece, 1)
    // stretch the last row down to the horizon so nothing shows below the photo
    const last = await sharp(buf)
      .extract({ left: 0, top: h - 1, width: W, height: 1 })
      .resize(W, H - h, { fit: 'fill' })
      .png()
      .toBuffer()
    return sharp({ create: { width: W, height: H, channels: 4, background: '#0000' } })
      .composite([
        { input: buf, top: 0, left: 0 },
        { input: last, top: h, left: 0 }
      ])
      .png()
      .toBuffer()
  }
  return sharp({ create: { width: W, height: H, channels: 4, background: '#0000' } })
    .composite([{ input: strip, top: 0, left: 0 }])
    .png()
    .toBuffer()
}

async function buildRidge(img, iw, ih, r) {
  const srcH = Math.round((r.y1 - r.y0) * ih)
  const s = r.h / srcH
  const srcW = Math.min(iw, Math.round(640 / r.k / s))
  const left = Math.max(0, Math.min(iw - srcW, Math.round(r.cx * iw - srcW / 2)))
  const piece = await img
    .clone()
    .extract({ left, top: Math.round(r.y0 * ih), width: srcW, height: srcH })
    .resize(Math.round(640 / r.k), r.h, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { data, info } = piece
  const rows = r.key ? Math.round(info.height * (r.keyRows ?? 1)) : 0
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4
      const [R, G, B] = [data[i], data[i + 1], data[i + 2]]
      const blueish = B - Math.max(R, G)
      const bright = Math.min(R, G, B)
      let a = 1
      if (blueish > 6) a = Math.max(0, 1 - (blueish - 6) / 22)
      if (bright > 175 && Math.abs(B - R) < 40) a = Math.min(a, Math.max(0, 1 - (bright - 175) / 30))
      data[i + 3] = a < 0.7 ? 0 : Math.round(255 * a)
    }
  }
  for (let y = 0; y < (r.fade ?? 0); y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4
      data[i + 3] = Math.round(data[i + 3] * (y / r.fade))
    }
  }
  const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer()
  const h = info.height
  const flipped = await sharp(png).flop().png().toBuffer()
  const pw = info.width
  const tiles = []
  for (let i = 0; i < r.k * 2; i++) tiles.push({ input: i % 2 ? flipped : png, left: i * pw, top: 0 })
  const row = await sharp({ create: { width: W, height: h, channels: 4, background: '#0000' } })
    .composite(tiles)
    .png()
    .toBuffer()

  // opaque base under the horizon: the bottom row's average colour
  const bottom = await sharp(row)
    .extract({ left: 0, top: h - 1, width: W, height: 1 })
    .raw()
    .toBuffer()
  let rr = 0,
    gg = 0,
    bb = 0
  for (let i = 0; i < bottom.length; i += 4) {
    rr += bottom[i]
    gg += bottom[i + 1]
    bb += bottom[i + 2]
  }
  const n = bottom.length / 4
  const base = await sharp({
    create: { width: W, height: H - HORIZON, channels: 4, background: { r: rr / n, g: gg / n, b: bb / n, alpha: 1 } }
  })
    .png()
    .toBuffer()
  return sharp({ create: { width: W, height: H, channels: 4, background: '#0000' } })
    .composite([
      { input: row, top: HORIZON - h, left: 0 },
      { input: base, top: HORIZON, left: 0 }
    ])
    .png()
    .toBuffer()
}

for (const file of readdirSync(photosDir)) {
  const id = file.replace(/.jpg$/, '')
  if (file.endsWith('.jpg') && /^[a-z]+$/.test(id) && !PHOTOS[id]) PHOTOS[id] = { file, ...DEFAULT_CROP }
}

for (const [id, cfg] of Object.entries(PHOTOS)) {
  if (only.length && !only.includes(id)) continue
  if (!existsSync(join(photosDir, cfg.file))) continue
  const img = sharp(join(photosDir, cfg.file)).rotate()
  const { width: iw, height: ih } = await img.metadata()
  const sky = await buildSky(img, iw, ih, cfg.sky)
  const ridge = await buildRidge(img, iw, ih, cfg.ridge)
  await sharp(sky)
    .webp({ quality: 82 })
    .toFile(join(outDir, `bg-${id}-sky.webp`))
  await sharp(ridge)
    .webp({ quality: 82 })
    .toFile(join(outDir, `bg-${id}-ridge.webp`))
  await sharp({ create: { width: W, height: 340, channels: 4, background: '#2a9d2a' } })
    .composite([
      { input: await sharp(sky).extract({ left: 0, top: 0, width: W, height: 340 }).png().toBuffer(), top: 0, left: 0 },
      {
        input: await sharp(ridge).extract({ left: 0, top: 0, width: W, height: 340 }).png().toBuffer(),
        top: 0,
        left: 0
      }
    ])
    .png()
    .toFile(join(outDir, `_preview-${id}.png`))
  console.log(id, 'ok')
}
