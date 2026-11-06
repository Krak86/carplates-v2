import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterEach, describe, expect, it } from 'vitest'

import { SHEET_PAGE_SIZE, writeContactSheets, type SheetEntry } from './wiki-paint-sheet.js'

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

const solid = (path: string, rgb: [number, number, number]): Promise<unknown> =>
  sharp({ create: { width: 64, height: 48, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } } })
    .jpeg()
    .toFile(path)

describe('writeContactSheets', () => {
  it('pages the entries and tolerates missing preview files', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wp-sheet-'))
    dirs.push(dir)
    const entries: SheetEntry[] = []
    for (let i = 0; i < SHEET_PAGE_SIZE + 1; i++) {
      const name = String(i + 1).padStart(3, '0')
      await solid(join(dir, `${name}.orig.jpg`), [90, 90, 90])
      if (i === 0) await solid(join(dir, `${name}.red.jpg`), [200, 20, 20])
      entries.push({ name, status: i === 0 ? 'ok' : 'skip', note: i === 0 ? 'white area 0.5' : 'dark_paint <&>' })
    }
    const files = await writeContactSheets(dir, entries, 'red')
    expect(files).toEqual(['sheet-1.jpg', 'sheet-2.jpg'])
    const meta = await sharp(join(dir, 'sheet-1.jpg')).metadata()
    expect(meta.width).toBeGreaterThan(1000)
  })
})
