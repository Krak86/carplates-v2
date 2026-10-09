import { NotFoundException } from '@nestjs/common'
import type { Registration } from '@carplates/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EvService } from '../ev/ev.service.js'
import type { FxService } from '../fx/fx.service.js'
import type { Models360Service } from '../models360/models360.service.js'
import type { Models3dService } from '../models3d/models3d.service.js'
import type { PlateService } from '../plate/plate.service.js'
import type { RdwService } from '../rdw/rdw.service.js'
import type { VdbService } from '../vdb/vdb.service.js'
import type { WikiService } from '../wiki/wiki.service.js'
import { CardService } from './card.service.js'

const fxRates = { date: '2026-10-09', eurUah: 48, usdUah: 41 }

function setup(current: Partial<Registration> | null) {
  const plates = { current: vi.fn().mockResolvedValue(current) }
  const vdb = { lookup: vi.fn().mockResolvedValue({ brand: 'B', model: 'M', match: null }) }
  const rdw = {
    lookup: vi.fn().mockResolvedValue({ brand: 'B', model: 'M', year: 2023, match: { valueEstimate: { eur: 1 } } })
  }
  const ev = { lookup: vi.fn().mockResolvedValue({ brand: 'B', model: 'M', match: null }) }
  const models3d = { lookup: vi.fn().mockResolvedValue({ models: [] }) }
  const models360 = { lookup: vi.fn().mockResolvedValue({ models: [], winner: [] }) }
  const wiki = { peekImage: vi.fn().mockResolvedValue({ image: null }) }
  const fx = { peek: vi.fn().mockReturnValue(fxRates) }
  const service = new CardService(
    plates as unknown as PlateService,
    vdb as unknown as VdbService,
    rdw as unknown as RdwService,
    ev as unknown as EvService,
    models3d as unknown as Models3dService,
    models360 as unknown as Models360Service,
    wiki as unknown as WikiService,
    fx as unknown as FxService
  )
  return { service, plates, vdb, rdw, ev, models3d, models360, wiki, fx }
}

const petrol = {
  plate: 'HC0500YC',
  brand: 'PORSCHE',
  model: 'TAYCAN',
  makeYear: 2023,
  kind: 'ЛЕГКОВИЙ',
  fuel: 'БЕНЗИН'
}

describe('CardService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws NotFound for an unknown plate', async () => {
    const { service } = setup(null)
    await expect(service.bundle('XX')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('answers each part with the inputs the web would send', async () => {
    const { service, vdb, rdw, models3d, wiki } = setup(petrol)
    const out = await service.bundle('HC0500YC')

    expect(vdb.lookup).toHaveBeenCalledWith('PORSCHE', 'TAYCAN', 'ЛЕГКОВИЙ')
    expect(rdw.lookup).toHaveBeenCalledWith('PORSCHE', 'TAYCAN', 2023, 'ЛЕГКОВИЙ')
    expect(models3d.lookup).toHaveBeenCalledWith('PORSCHE', 'TAYCAN')
    expect(wiki.peekImage).toHaveBeenCalledWith('PORSCHE', 'TAYCAN', 2023)
    expect(out.plate).toBe('HC0500YC')
    expect(out.fx).toEqual(fxRates)
  })

  it('skips EV for a combustion car and fetches it for an electric one', async () => {
    const petrolRun = setup(petrol)
    expect((await petrolRun.service.bundle('p')).ev).toBeNull()
    expect(petrolRun.ev.lookup).not.toHaveBeenCalled()

    const electricRun = setup({ ...petrol, fuel: 'ЕЛЕКТРО' })
    expect((await electricRun.service.bundle('p')).ev).not.toBeNull()
    expect(electricRun.ev.lookup).toHaveBeenCalledWith('PORSCHE', 'TAYCAN')
  })

  it('skips RDW without a year, and the NBU rates without an estimate', async () => {
    const run = setup({ ...petrol, makeYear: null })
    const out = await run.service.bundle('p')
    expect(out.rdw).toBeNull()
    expect(run.rdw.lookup).not.toHaveBeenCalled()
    expect(run.fx.peek).not.toHaveBeenCalled()
    expect(out.fx).toBeNull()
  })

  it('turns a failing part into null without losing the others', async () => {
    const run = setup(petrol)
    run.vdb.lookup.mockRejectedValue(new Error('boom'))
    const out = await run.service.bundle('p')
    expect(out.vdb).toBeNull()
    expect(out.models3d).toEqual({ models: [] })
  })
})
