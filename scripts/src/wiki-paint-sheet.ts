/**
 * Contact sheets for the gallery review of a paint scan (docs/wiki-recolor-plan.md, step 9): `sheet-1.jpg`, `sheet-2.jpg`, ...
 * Each cell is the original photo next to the recoloured one (or just the original, tagged with the skip reason) under its name.
 * Built from the files `wiki-paint.ts --out DIR` already wrote, so it needs no DB and no model.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import sharp, { type OverlayOptions } from 'sharp'

export type SheetEntry = { name: string; status: 'ok' | 'skip' | 'error'; note: string }

const CELL_W = 280
const CELL_H = 190
const LABEL_H = 22
const COLS = 3
const ROWS = 6
export const SHEET_PAGE_SIZE = COLS * ROWS

const escapeXml = (s: string): string => s.replace(/[<>&"]/g, c => `&#${c.charCodeAt(0)};`)

async function tile(path: string): Promise<Buffer> {
  return sharp(path).resize(CELL_W, CELL_H, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer()
}

const label = (text: string, width: number, colour: string): Buffer =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${LABEL_H}"><rect width="100%" height="100%" fill="#111"/>` +
      `<text x="6" y="15" font-family="sans-serif" font-size="12" fill="${colour}">${escapeXml(text)}</text></svg>`
  )

/** Writes one JPEG per page of `SHEET_PAGE_SIZE` entries; returns the file names. `colour` names the recolour preview files. */
export async function writeContactSheets(dir: string, entries: SheetEntry[], colour: string): Promise<string[]> {
  const files: string[] = []
  const cellW = CELL_W * 2
  const cellH = CELL_H + LABEL_H
  for (let page = 0; page * SHEET_PAGE_SIZE < entries.length; page++) {
    const slice = entries.slice(page * SHEET_PAGE_SIZE, (page + 1) * SHEET_PAGE_SIZE)
    const layers: OverlayOptions[] = []
    for (const [i, e] of slice.entries()) {
      const left = (i % COLS) * cellW
      const top = Math.floor(i / COLS) * cellH
      const orig = join(dir, `${e.name}.orig.jpg`)
      const paint = join(dir, `${e.name}.${colour}.jpg`)
      if (existsSync(orig)) layers.push({ input: await tile(orig), left, top })
      if (e.status === 'ok' && existsSync(paint)) layers.push({ input: await tile(paint), left: left + CELL_W, top })
      const ok = e.status === 'ok'
      layers.push({
        input: label(`${e.name} ${ok ? 'ok' : e.status} ${e.note}`.trim(), cellW, ok ? '#9be29b' : '#f0b36b'),
        left,
        top: top + CELL_H
      })
    }
    const file = `sheet-${page + 1}.jpg`
    await sharp({
      create: { width: COLS * cellW, height: ROWS * cellH, channels: 3, background: '#000' }
    })
      .composite(layers)
      .jpeg({ quality: 82 })
      .toFile(join(dir, file))
    files.push(file)
  }
  return files
}
