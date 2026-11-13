import { describe, expect, it, vi } from 'vitest'

import { AccountPurgeService, deletionLedgerKey } from './account-purge.service.js'
import type { DbService } from '../db/db.service.js'
import type { SharesCleanupService } from '../shares/shares-cleanup.service.js'
import type { ShareObjectStore } from '../shares/types.js'

vi.mock('../env.js', () => ({
  loadEnv: () => ({ NODE_ENV: 'test', ACCOUNT_DELETION_GRACE_DAYS: 14 }),
  sharesStorageConfigured: () => configured
}))
let configured = true

const IDS = ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222']

function setup(putFails = false) {
  const calls: string[] = []
  const db = {
    select: () => ({ from: () => ({ where: async () => IDS.map(id => ({ id })) }) }),
    delete: () => ({
      where: () => ({
        returning: async () => {
          calls.push('delete')
          return IDS.map(id => ({ id }))
        }
      })
    })
  }
  const store: ShareObjectStore = {
    put: vi.fn(async (key: string) => {
      calls.push(`put ${key}`)
      if (putFails) throw new Error('R2 down')
    }),
    get: vi.fn(async () => null),
    delete: vi.fn(async () => undefined)
  }
  const shares = { deleteForUsers: vi.fn(async () => undefined) }
  const service = new AccountPurgeService(
    { db } as unknown as DbService,
    shares as unknown as SharesCleanupService,
    store
  )
  return { service, store, calls }
}

describe('AccountPurgeService.purge ledger', () => {
  it('writes deleted/<uuid> for every purged account before deleting the rows', async () => {
    configured = true
    const { service, calls } = setup()
    expect(await service.purge()).toBe(2)
    expect(calls).toEqual([...IDS.map(id => `put ${deletionLedgerKey(id)}`), 'delete'])
    expect(deletionLedgerKey(IDS[0] as string)).toBe(`deleted/${IDS[0]}`)
  })

  it('keeps the rows when the ledger cannot be written', async () => {
    configured = true
    const { service, calls } = setup(true)
    expect(await service.purge()).toBe(0)
    expect(calls).not.toContain('delete')
  })

  it('skips the ledger when R2 is not configured', async () => {
    configured = false
    const { service, store } = setup()
    expect(await service.purge()).toBe(2)
    expect(store.put).not.toHaveBeenCalled()
  })
})
