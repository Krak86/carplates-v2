import { wantedPlates, wantedVehicles } from '@carplates/db'
import { wantedResponseSchema } from '@carplates/shared'
import { describe, expect, it, vi } from 'vitest'

import type { DbService } from '../db/db.service.js'
import { WantedService } from './wanted.service.js'

const LAST_SEEN = new Date('2026-10-31T04:40:00Z')

function plateRow(over: Record<string, unknown> = {}) {
  return {
    sourceId: 'g1',
    plate: 'ВА0399ЕН',
    seizedAt: '2026-03-10',
    insertedAt: '2026-03-11',
    organUnit: 'ГУНП В КИЇВСЬКІЙ ОБЛАСТІ',
    region: 'Київська область',
    resolvedAt: null,
    ...over
  }
}

/** A chainable stand-in for `db.select().from(table).where().orderBy().limit()`: rows depend on the table. */
function setup(plateRows: unknown[], vehicleRows: unknown[] = []) {
  const select = vi.fn().mockImplementation((cols?: unknown) => ({
    from: (table: unknown) => {
      const rows = cols
        ? [{ checkedAt: LAST_SEEN, trackedSince: LAST_SEEN, historySince: null }]
        : table === wantedPlates
          ? plateRows
          : vehicleRows
      const chain = Object.assign(Promise.resolve(rows), {
        where: () => chain,
        orderBy: () => chain,
        limit: () => chain
      })
      return table === wantedVehicles || table === wantedPlates ? chain : Promise.resolve([])
    }
  }))
  const service = new WantedService({ db: { select } } as unknown as DbService)
  return { service, select }
}

describe('WantedService.lookup', () => {
  it('returns the Garpun records of a plate, separate from the vehicle list', async () => {
    const { service } = setup([plateRow(), plateRow({ sourceId: 'g0', resolvedAt: new Date('2026-05-01T00:00:00Z') })])
    const res = await service.lookup('ВА0399ЕН', null)

    expect(wantedResponseSchema.safeParse(res).error?.issues).toBeUndefined()
    expect(res.wanted).toBe(false)
    expect(res.plateWanted).toBe(true)
    expect(res.plates).toHaveLength(2)
    expect(res.plates?.[0]).toMatchObject({ id: 'g1', status: 'wanted', removedAt: null, plate: 'ВА0399ЕН' })
    expect(res.plates?.[1]).toMatchObject({ status: 'removed', removedAt: '2026-05-01T00:00:00.000Z' })
  })

  it('does not report a plate that is only in the removed history as wanted', async () => {
    const { service } = setup([plateRow({ resolvedAt: new Date('2026-05-01T00:00:00Z') })])
    const res = await service.lookup('ВА0399ЕН', null)

    expect(res.plateWanted).toBe(false)
    expect(res.plates).toHaveLength(1)
  })

  it('never queries Garpun for a VIN-only lookup', async () => {
    const { service, select } = setup([plateRow()])
    const res = await service.lookup(null, 'XTA211440A4913850')

    expect(res.plates).toEqual([])
    expect(res.plateWanted).toBe(false)
    // vehicle lookup + the freshness probe only
    expect(select).toHaveBeenCalledTimes(2)
  })
})
