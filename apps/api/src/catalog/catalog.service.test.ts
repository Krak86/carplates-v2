import { catalogLookupSchema } from '@carplates/shared'
import { describe, expect, it, vi } from 'vitest'

import type { DbService } from '../db/db.service.js'

import { CatalogService } from './catalog.service.js'

/** The snapshot read: model rows, alias rows, make rows, then the distinct pronounced slugs (selectDistinct). */
function setup(pronounced: string[]) {
  const model = {
    makeSlug: 'bmw',
    modelSlug: 'x5',
    makeName: 'BMW',
    modelName: 'X5',
    n: 10,
    yearMin: 2000,
    yearMax: 2025,
    topRawBrand: 'BMW',
    topRawModel: 'X5',
    kindGroup: 'car',
    indexable: true,
    rank: 1,
    stats: {}
  }
  const results = [[model], [], []]
  const select = vi.fn().mockImplementation(() => ({ from: () => Promise.resolve(results.shift() ?? []) }))
  const selectDistinct = vi.fn().mockImplementation(() => ({
    from: () => Promise.resolve(pronounced.map(slug => ({ slug })))
  }))
  return new CatalogService({ db: { select, selectDistinct } } as unknown as DbService)
}

describe('CatalogService.lookup pronounce', () => {
  it('names the make slug when the brand has a pronunciation, even without a model page', async () => {
    const res = await setup(['bmw']).lookup('BMW', 'Z4')
    expect(catalogLookupSchema.safeParse(res).error?.issues).toBeUndefined()
    expect(res).toEqual({ page: null, pronounce: 'bmw' })
  })

  it('is null for a make without pronunciation rows', async () => {
    const res = await setup([]).lookup('BMW', 'Z4')
    expect(res.pronounce).toBeNull()
  })
})
