import { BadRequestException } from '@nestjs/common'
import type { PipeTransform } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

import { WikiPhotosController } from './wiki-photos.controller.js'
import type { WikiPhotosService } from './wiki-photos.service.js'

function build(): { controller: WikiPhotosController; lookup: ReturnType<typeof vi.fn> } {
  const lookup = vi.fn().mockResolvedValue({ photos: [] })
  return { controller: new WikiPhotosController({ lookup } as unknown as WikiPhotosService), lookup }
}

/** The Zod pipe Nest runs on `@Query()` before `lookup` is called. */
function queryPipe(): PipeTransform<unknown, { brand: string; model: string; year?: number; color?: string }> {
  const args = Reflect.getMetadata('__routeArguments__', WikiPhotosController, 'lookup') as Record<
    string,
    { pipes: (new () => PipeTransform)[] }
  >
  const Pipe = Object.values(args)[0]!.pipes[0]!
  return new Pipe() as PipeTransform<unknown, { brand: string; model: string; year?: number; color?: string }>
}

describe('WikiPhotosController.lookup', () => {
  it('passes null for an absent year and colour', async () => {
    const { controller, lookup } = build()
    await controller.lookup({ brand: 'kia', model: 'ceed' })
    expect(lookup).toHaveBeenCalledWith('kia', 'ceed', null, null)
  })

  it('passes year and colour through', async () => {
    const { controller, lookup } = build()
    await controller.lookup({ brand: 'kia', model: 'ceed', year: 2012, color: 'red' })
    expect(lookup).toHaveBeenCalledWith('kia', 'ceed', 2012, 'red')
  })

  it('returns what the service found', async () => {
    const { controller } = build()
    await expect(controller.lookup({ brand: 'kia', model: 'ceed' })).resolves.toEqual({ photos: [] })
  })
})

describe('WikiPhotosController query validation', () => {
  it('coerces the year and keeps a registry colour', () => {
    expect(
      queryPipe().transform({ brand: ' kia ', model: 'ceed', year: '2012', color: 'red' }, { type: 'query' })
    ).toEqual({
      brand: 'kia',
      model: 'ceed',
      year: 2012,
      color: 'red'
    })
  })

  it.each([
    ['no brand', { model: 'ceed' }],
    ['no model', { brand: 'kia' }],
    ['a blank brand', { brand: '  ', model: 'ceed' }],
    ['an unknown colour', { brand: 'kia', model: 'ceed', color: 'pink' }],
    ['a year out of range', { brand: 'kia', model: 'ceed', year: '1800' }]
  ])('rejects %s with a 400', (_name, query) => {
    expect(() => queryPipe().transform(query, { type: 'query' })).toThrow(BadRequestException)
  })
})
