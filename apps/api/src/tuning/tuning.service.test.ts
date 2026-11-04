import { describe, expect, it, vi } from 'vitest'

import type { CatalogService } from '../catalog/catalog.service.js'
import type { DbService } from '../db/db.service.js'

import { TuningService } from './tuning.service.js'

const row = (path: string, body: string, generation: string, startYear: number) => {
  const [, makeSlug, modelSlug] = path.split('/') as [string, string, string]
  return { makeSlug, modelSlug, body, generation, startYear, path, updatedAt: new Date() }
}
const rows = [
  row('tuning/bmw/3.series/sedan-e90.2005', 'sedan', 'e90', 2005),
  row('tuning/bmw/3.series/wagon-e91.2005', 'wagon', 'e91', 2005)
]

function service(page: { make: string; model: string } | null): TuningService {
  const db = { select: () => ({ from: () => Promise.resolve(rows) }) }
  const catalog = { lookup: vi.fn().mockResolvedValue({ page }) }
  return new TuningService({ db } as unknown as DbService, catalog as unknown as CatalogService)
}

describe('TuningService', () => {
  it('links a confident match through the catalog slugs', async () => {
    const res = await service({ make: 'bmw', model: '3series' }).lookup({
      brand: 'BMW',
      model: '320',
      year: 2007,
      body: 'СЕДАН-B'
    })
    expect(res.link?.path).toBe('tuning/bmw/3.series/sedan-e90.2005')
  })

  it('gives no link when the body is unknown for a multi-body model', async () => {
    const res = await service({ make: 'bmw', model: '3series' }).lookup({ brand: 'BMW', model: '320', year: 2007 })
    expect(res.link).toBeNull()
  })

  it('gives no link for an unknown brand', async () => {
    const res = await service(null).lookup({ brand: '???', model: 'X', year: 2007 })
    expect(res.link).toBeNull()
  })
})
