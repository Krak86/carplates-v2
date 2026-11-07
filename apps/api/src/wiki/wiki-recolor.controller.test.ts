import { NotFoundException, StreamableFile } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

import { WikiRecolorController } from './wiki-recolor.controller.js'
import type { WikiRecolorService } from './wiki-recolor.service.js'

const ID = 'a'.repeat(32)

function build(mask: Buffer | null): { controller: WikiRecolorController; maskOf: ReturnType<typeof vi.fn> } {
  const maskOf = vi.fn().mockResolvedValue(mask)
  const service = { mask: maskOf } as unknown as WikiRecolorService
  return { controller: new WikiRecolorController(service), maskOf }
}

describe('WikiRecolorController.mask', () => {
  it('streams the stored mask as webp', async () => {
    const { controller, maskOf } = build(Buffer.from('webp'))
    const file = await controller.mask(`${ID}.webp`)
    expect(file).toBeInstanceOf(StreamableFile)
    expect(file.getHeaders().type).toBe('image/webp')
    expect(maskOf).toHaveBeenCalledWith(ID)
  })

  it('is a 404 (not a header-carrying 500) for an unknown mask', async () => {
    const { controller } = build(null)
    await expect(controller.mask(`${ID}.webp`)).rejects.toBeInstanceOf(NotFoundException)
  })
})
