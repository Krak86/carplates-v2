import { wikiPaintMaskId } from '@carplates/db'
import type { WikiPaintInfo } from '@carplates/db'
import { wikiRecolorResponseSchema } from '@carplates/shared'
import type { WikiImageResponse } from '@carplates/shared'
import { describe, expect, it, vi } from 'vitest'

import type { WikiPaintStore } from './wiki-paint.store.js'
import { WikiRecolorService } from './wiki-recolor.service.js'
import type { WikiService } from './wiki.service.js'

const URL = 'https://upload.wikimedia.org/thumb/camry.jpg'
const PAINT: WikiPaintInfo = { bucket: 'white', lab: [88, 0, -3], w: 640, h: 427, algo: 1 }

const photo = (url: string): WikiImageResponse => ({
  image: { url, width: 1280, height: 853, attribution: null },
  from: 'db'
})

function build(stored: WikiImageResponse | null, paint: WikiPaintInfo | null, mask: Buffer | null = null) {
  const peekImage = vi.fn().mockResolvedValue(stored)
  const find = vi.fn().mockResolvedValue(paint)
  const service = new WikiRecolorService(
    { peekImage } as unknown as WikiService,
    { find, mask: vi.fn().mockResolvedValue(mask) } as unknown as WikiPaintStore
  )
  return { service, peekImage, find }
}

describe('WikiRecolorService', () => {
  it('returns the scan with a versioned mask url', async () => {
    const { service, peekImage, find } = build(photo(URL), PAINT)
    const res = await service.lookup('toyota', 'camry', 2018)
    expect(peekImage).toHaveBeenCalledWith('toyota', 'camry', 2018)
    expect(find).toHaveBeenCalledWith(URL)
    expect(res.recolor).toEqual({
      imageUrl: URL,
      bucket: 'white',
      lab: [88, 0, -3],
      maskUrl: `/api/wiki/paint/${wikiPaintMaskId(URL)}.webp?v=1`,
      w: 640,
      h: 427
    })
    expect(wikiRecolorResponseSchema.safeParse(res).success).toBe(true)
  })

  it('is null when no photo is stored (and never looks up a paint row)', async () => {
    const { service, find } = build(null, PAINT)
    expect(await service.lookup('toyota', 'camry', null)).toEqual({ recolor: null })
    expect(find).not.toHaveBeenCalled()
  })

  it('is null when the stored answer has no image', async () => {
    const { service } = build({ image: null }, PAINT)
    expect(await service.lookup('toyota', 'camry', null)).toEqual({ recolor: null })
  })

  it('is null when the photo was not scanned or was skipped', async () => {
    const { service } = build(photo(URL), null)
    expect(await service.lookup('toyota', 'camry', 2018)).toEqual({ recolor: null })
  })

  it('is null for an unknown bucket instead of a broken contract', async () => {
    const { service } = build(photo(URL), { ...PAINT, bucket: 'chartreuse' })
    expect(await service.lookup('toyota', 'camry', 2018)).toEqual({ recolor: null })
  })

  it('serves the mask bytes by id, null when missing', async () => {
    const bytes = Buffer.from('webp')
    expect(await build(null, null, bytes).service.mask('a'.repeat(32))).toBe(bytes)
    expect(await build(null, null).service.mask('a'.repeat(32))).toBeNull()
  })

  it('mask ids are 32 hex chars and stable per url', () => {
    expect(wikiPaintMaskId(URL)).toMatch(/^[0-9a-f]{32}$/)
    expect(wikiPaintMaskId(URL)).toBe(wikiPaintMaskId(URL))
    expect(wikiPaintMaskId(URL)).not.toBe(wikiPaintMaskId(`${URL}x`))
  })
})
