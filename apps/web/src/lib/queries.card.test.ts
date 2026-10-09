import { QueryClient } from '@tanstack/react-query'
import type { CardBundleResponse, PlateLookupResponse } from '@carplates/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCardBundle, lookupPlate } from '@/lib/api'
import {
  fxQuery,
  models3dQuery,
  openEvQuery,
  plateQuery,
  rdwQuery,
  seedCardBundle,
  vdbQuery,
  wikiImageQuery
} from '@/lib/queries'

vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  lookupPlate: vi.fn(),
  getCardBundle: vi.fn()
}))

const vehicle = { brand: 'PORSCHE', model: 'TAYCAN', makeYear: 2023, kind: 'ЛЕГКОВИЙ' }
const bundle: CardBundleResponse = {
  plate: 'HC0500YC',
  vdb: { brand: 'PORSCHE', model: 'TAYCAN', match: null },
  rdw: { brand: 'PORSCHE', model: 'TAYCAN', year: 2023, match: null },
  ev: { brand: 'PORSCHE', model: 'TAYCAN', match: null },
  models3d: { models: [] },
  fx: { date: '2026-10-09', eurUah: 48, usdUah: 41 },
  wikiImage: { image: null }
}

const plateResponse = { plate: 'HC0500YC', current: vehicle } as unknown as PlateLookupResponse

describe('seedCardBundle', () => {
  it('writes every known part under the key its own query reads', () => {
    const client = new QueryClient()
    seedCardBundle(client, vehicle, bundle)

    expect(client.getQueryData(vdbQuery('PORSCHE', 'TAYCAN', 'ЛЕГКОВИЙ').queryKey)).toEqual(bundle.vdb)
    expect(client.getQueryData(rdwQuery('PORSCHE', 'TAYCAN', 2023, 'ЛЕГКОВИЙ').queryKey)).toEqual(bundle.rdw)
    expect(client.getQueryData(openEvQuery('PORSCHE', 'TAYCAN').queryKey)).toEqual(bundle.ev)
    expect(client.getQueryData(models3dQuery('PORSCHE', 'TAYCAN').queryKey)).toEqual(bundle.models3d)
    expect(client.getQueryData(fxQuery().queryKey)).toEqual(bundle.fx)
    expect(client.getQueryData(wikiImageQuery('PORSCHE', 'TAYCAN', 2023).queryKey)).toEqual({ image: null })
  })

  it('leaves a null part and already cached data alone', () => {
    const client = new QueryClient()
    const cachedKey = vdbQuery('PORSCHE', 'TAYCAN', 'ЛЕГКОВИЙ').queryKey
    const cached = { brand: 'PORSCHE', model: 'TAYCAN (cached)', match: null }
    client.setQueryData(cachedKey, cached)

    seedCardBundle(client, vehicle, { ...bundle, models360: null, fx: null })

    expect(client.getQueryData(cachedKey)).toEqual(cached)
    expect(client.getQueryData(fxQuery().queryKey)).toBeUndefined()
  })

  it('does not seed RDW without a year', () => {
    const client = new QueryClient()
    seedCardBundle(client, { ...vehicle, makeYear: null }, bundle)
    expect(client.getQueryData(rdwQuery('PORSCHE', 'TAYCAN', 2023, 'ЛЕГКОВИЙ').queryKey)).toBeUndefined()
    expect(client.getQueryData(openEvQuery('PORSCHE', 'TAYCAN').queryKey)).toEqual(bundle.ev)
  })
})

describe('plateQuery', () => {
  beforeEach(() => vi.clearAllMocks())

  it('seeds the chips caches from the bundle fetched alongside the lookup', async () => {
    vi.mocked(lookupPlate).mockResolvedValue(plateResponse)
    vi.mocked(getCardBundle).mockResolvedValue(bundle)
    const client = new QueryClient()

    expect(await client.fetchQuery(plateQuery('HC0500YC'))).toBe(plateResponse)
    expect(client.getQueryData(vdbQuery('PORSCHE', 'TAYCAN', 'ЛЕГКОВИЙ').queryKey)).toEqual(bundle.vdb)
  })

  it('still answers when the bundle fails', async () => {
    vi.mocked(lookupPlate).mockResolvedValue(plateResponse)
    vi.mocked(getCardBundle).mockRejectedValue(new Error('down'))
    const client = new QueryClient()

    expect(await client.fetchQuery(plateQuery('HC0500YC'))).toBe(plateResponse)
    expect(client.getQueryData(vdbQuery('PORSCHE', 'TAYCAN', 'ЛЕГКОВИЙ').queryKey)).toBeUndefined()
  })

  it('still rejects when the plate is unknown', async () => {
    vi.mocked(lookupPlate).mockRejectedValue(new Error('404'))
    vi.mocked(getCardBundle).mockResolvedValue(bundle)
    await expect(new QueryClient().fetchQuery(plateQuery('HC0500YC'))).rejects.toThrow('404')
  })
})
