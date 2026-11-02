import { beforeEach, describe, expect, it } from 'vitest'

import {
  PENDING_SHARE_TTL_MS,
  clearPendingShare,
  hasPendingShare,
  savePendingShare,
  takePendingShare
} from '@/lib/pending-share'

// jsdom has no IndexedDB: these cover the marker and the "record is gone" path the page turns into "pick the photo again".
describe('pending share', () => {
  beforeEach(() => localStorage.clear())

  it('marks a started share for one hour, even when the record cannot be stored', async () => {
    const now = Date.now()
    await savePendingShare(new Blob(['x'], { type: 'image/jpeg' }), now)
    expect(hasPendingShare(now + PENDING_SHARE_TTL_MS - 1000)).toBe(true)
    expect(hasPendingShare(now + PENDING_SHARE_TTL_MS + 1000)).toBe(false)
  })

  it('is deleted on use: taking it returns no file here and clears the marker', async () => {
    await savePendingShare(new Blob(['x']))
    expect(hasPendingShare()).toBe(true)
    expect((await takePendingShare()).file).toBeNull()
    expect(hasPendingShare()).toBe(false)
  })

  it('clearPendingShare removes the marker (sign-out)', async () => {
    await savePendingShare(new Blob(['x']))
    await clearPendingShare()
    expect(hasPendingShare()).toBe(false)
  })
})
