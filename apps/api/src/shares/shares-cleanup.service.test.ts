import { describe, expect, it, vi } from 'vitest'

import { SharesCleanupService } from './shares-cleanup.service.js'
import type { SharesRepository } from './shares.repository.js'
import type { ShareObjectStore } from './types.js'

function setup(due: { id: string; objectKey: string; originalKey?: string | null }[][]) {
  const batches = [...due]
  const repo = {
    listDue: vi.fn(async () => batches.shift() ?? []),
    deleteByIds: vi.fn(async () => undefined),
    listStaleOriginals: vi.fn(async (_before: Date, _limit: number) => [{ id: '1', originalKey: 'shares/1.orig' }]),
    clearOriginals: vi.fn(async (_ids: string[]) => undefined),
    deleteOfUsers: vi.fn(async () => ['shares/a.jpg', 'shares/b.jpg'])
  }
  const store: ShareObjectStore = {
    put: vi.fn(async () => undefined),
    get: vi.fn(async () => null),
    delete: vi.fn(async () => undefined)
  }
  return { repo, store, service: new SharesCleanupService(repo as unknown as SharesRepository, store) }
}

describe('SharesCleanupService.expire', () => {
  it('deletes the objects of expired shares, then their rows', async () => {
    const { service, repo, store } = setup([
      [
        { id: '1', objectKey: 'shares/1.jpg' },
        { id: '2', objectKey: 'shares/2.jpg' }
      ]
    ])
    expect(await service.expire()).toBe(2)
    expect(vi.mocked(store.delete).mock.calls.map(c => c[0])).toEqual(['shares/1.jpg', 'shares/2.jpg'])
    expect(repo.deleteByIds).toHaveBeenCalledWith(['1', '2'])
  })

  it('keeps the row of a share whose object could not be deleted, so tomorrow retries it', async () => {
    const { service, repo, store } = setup([
      [
        { id: '1', objectKey: 'shares/1.jpg' },
        { id: '2', objectKey: 'shares/2.jpg' }
      ]
    ])
    vi.mocked(store.delete).mockRejectedValueOnce(new Error('r2 down'))
    expect(await service.expire()).toBe(1)
    expect(repo.deleteByIds).toHaveBeenCalledWith(['2'])
    expect(repo.listDue).toHaveBeenCalledTimes(1) // a partly failed batch ends the run instead of looping on the same rows
  })

  it('works through several batches', async () => {
    const { service, repo } = setup([[{ id: '1', objectKey: 'k1' }], [{ id: '2', objectKey: 'k2' }]])
    expect(await service.expire()).toBe(2)
    expect(repo.deleteByIds).toHaveBeenCalledTimes(2)
  })

  it('does nothing when nothing is due, and never throws when the DB fails', async () => {
    expect(await setup([]).service.expire()).toBe(0)
    const { service, repo } = setup([])
    repo.listDue.mockRejectedValue(new Error('db down'))
    expect(await service.expire()).toBe(0)
  })
})

describe('SharesCleanupService.deleteForUsers', () => {
  it('removes the rows first and then every stored object of the deleted accounts', async () => {
    const { service, repo, store } = setup([])
    await service.deleteForUsers(['u1'])
    expect(repo.deleteOfUsers).toHaveBeenCalledWith(['u1'])
    expect(vi.mocked(store.delete).mock.calls.map(c => c[0])).toEqual(['shares/a.jpg', 'shares/b.jpg'])
  })

  it('never throws, so a failure cannot block account deletion', async () => {
    const { service, repo, store } = setup([])
    vi.mocked(store.delete).mockRejectedValue(new Error('r2 down'))
    await expect(service.deleteForUsers(['u1'])).resolves.toBeUndefined()
    repo.deleteOfUsers.mockRejectedValue(new Error('db down'))
    await expect(service.deleteForUsers(['u1'])).resolves.toBeUndefined()
  })
})

describe('SharesCleanupService originals', () => {
  it('expire also deletes the unblurred upload of a due share', async () => {
    const { service, store } = setup([[{ id: '1', objectKey: 'shares/1.jpg', originalKey: 'shares/1.orig' }]])
    await service.expire()
    expect(vi.mocked(store.delete).mock.calls.map(c => c[0])).toEqual(['shares/1.jpg', 'shares/1.orig'])
  })

  it('sweeps unblurred uploads of abandoned dialogs and clears their keys', async () => {
    const { service, repo, store } = setup([])
    expect(await service.sweepOriginals()).toBe(1)
    const cutoff = repo.listStaleOriginals.mock.calls[0]?.[0] as Date
    expect(Date.now() - cutoff.getTime()).toBeGreaterThanOrEqual(59 * 60_000)
    expect(store.delete).toHaveBeenCalledWith('shares/1.orig')
    expect(repo.clearOriginals).toHaveBeenCalledWith(['1'])
  })

  it('keeps the key of an upload it could not delete, and never throws', async () => {
    const { service, repo, store } = setup([])
    vi.mocked(store.delete).mockRejectedValueOnce(new Error('r2 down'))
    expect(await service.sweepOriginals()).toBe(0)
    expect(repo.clearOriginals).toHaveBeenCalledWith([])
    repo.listStaleOriginals.mockRejectedValue(new Error('db down'))
    expect(await service.sweepOriginals()).toBe(0)
  })
})
