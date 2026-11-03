import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMarketActions } from './use-market-actions'

const api = vi.hoisted(() => ({ getMarket: vi.fn() }))

vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getMarket: api.getMarket
}))

const answer = {
  kind: 'ua' as const,
  items: [
    { id: 'a', source: 'auto_ria_ua', sourceName: 'Auto.ria', year: 2018 },
    { id: 'b', source: 'auto_ria_ua', sourceName: 'Auto.ria', year: 2012 }
  ]
}

let client = new QueryClient()

function wrapper({ children }: { children: ReactNode }): ReactNode {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useMarketActions', () => {
  beforeEach(() => {
    api.getMarket.mockReset()
    client = new QueryClient()
  })

  it('requests nothing until the section is open', () => {
    const { result } = renderHook(() => useMarketActions({ brand: 'KIA', model: "CEE'D", year: 2012 }, false), {
      wrapper
    })
    expect(api.getMarket).not.toHaveBeenCalled()
    expect(result.current).toEqual({ isPending: false, view: null })
  })

  it('needs a make and a model', () => {
    renderHook(() => useMarketActions({ brand: 'KIA', model: null }, true), { wrapper })
    renderHook(() => useMarketActions({ brand: null, model: 'CEED' }, true), { wrapper })
    expect(api.getMarket).not.toHaveBeenCalled()
  })

  it('never requests for a kind the catalogue does not hold', () => {
    renderHook(() => useMarketActions({ brand: 'YAMAHA', model: 'R1', kind: 'motorcycle' }, true), { wrapper })
    expect(api.getMarket).not.toHaveBeenCalled()
  })

  it('loads once open and floats the same-year cards first', async () => {
    api.getMarket.mockResolvedValue(answer)
    const { result } = renderHook(
      () => useMarketActions({ brand: 'KIA', model: "CEE'D", kind: 'ЛЕГКОВИЙ', year: 2012 }, true),
      {
        wrapper
      }
    )
    expect(result.current.isPending).toBe(true)
    await waitFor(() => expect(result.current.view?.cards.map(c => c.id)).toEqual(['b', 'a']))
    expect(api.getMarket).toHaveBeenCalledWith('KIA', "CEE'D", 'passenger')
    expect(result.current.isPending).toBe(false)
  })

  it('hides the block on none and on a failed request, without retrying', async () => {
    api.getMarket.mockResolvedValueOnce({ kind: 'none', items: [] })
    const none = renderHook(() => useMarketActions({ brand: 'KIA', model: 'CEED' }, true), { wrapper })
    await waitFor(() => expect(none.result.current.isPending).toBe(false))
    expect(none.result.current.view).toBeNull()

    client = new QueryClient()
    api.getMarket.mockReset()
    api.getMarket.mockRejectedValue(new Error('429'))
    const failed = renderHook(() => useMarketActions({ brand: 'SKODA', model: 'OCTAVIA' }, true), { wrapper })
    await waitFor(() => expect(failed.result.current.isPending).toBe(false))
    expect(failed.result.current.view).toBeNull()
    expect(api.getMarket).toHaveBeenCalledTimes(1)
  })
})
