import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSharedPhoto } from '@/components/use-shared-photo'
import { ApiError } from '@/lib/api'

const api = vi.hoisted(() => ({ getShare: vi.fn() }))

vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getShare: api.getShare
}))
vi.mock('@/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }))

const TOKEN = 'AAAAAAAAAAAAAAAAAAAAAA'
const meta = {
  plate: 'АА1234ВВ',
  candidates: [{ plate: 'АА1234ВВ', raw: 'AA1234BB', score: 0.9 }],
  expiresAt: '2026-11-09T12:00:00Z'
}

let client = new QueryClient()

function wrapper({ children }: { children: ReactNode }): ReactNode {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useSharedPhoto', () => {
  beforeEach(() => {
    api.getShare.mockReset()
    client = new QueryClient()
  })

  it('hands the metadata over once, without recognizing anything', async () => {
    api.getShare.mockResolvedValue(meta)
    const onLoaded = vi.fn()
    const { result, rerender } = renderHook(() => useSharedPhoto(TOKEN, onLoaded), { wrapper })

    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(TOKEN, meta))
    rerender()
    expect(onLoaded).toHaveBeenCalledTimes(1)
    expect(result.current).toEqual({ meta, expired: false })
  })

  it('reports an expired link on 410', async () => {
    api.getShare.mockRejectedValue(new ApiError(410, 'SHARE_EXPIRED'))
    const { result } = renderHook(() => useSharedPhoto(TOKEN, vi.fn()), { wrapper })
    await waitFor(() => expect(result.current.expired).toBe(true))
  })

  it('treats a malformed token as dead without calling the API, and ignores a missing one', () => {
    const bad = renderHook(() => useSharedPhoto('nope', vi.fn()), { wrapper })
    expect(bad.result.current.expired).toBe(true)
    const none = renderHook(() => useSharedPhoto(null, vi.fn()), { wrapper })
    expect(none.result.current).toEqual({ meta: null, expired: false })
    expect(api.getShare).not.toHaveBeenCalled()
  })
})
