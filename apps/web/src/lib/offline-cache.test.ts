import type { PersistedClient } from '@tanstack/react-query-persist-client'
import { describe, expect, it } from 'vitest'

import { OFFLINE_LIMITS, OFFLINE_MAX_AGE_MS, offlineGroup, pruneOfflineClient } from '@/lib/offline-cache'

type DehydratedQuery = PersistedClient['clientState']['queries'][number]

const NOW = 1_800_000_000_000

function query(queryKey: unknown[], dataUpdatedAt: number, status: 'success' | 'error' = 'success'): DehydratedQuery {
  return {
    queryKey,
    queryHash: JSON.stringify(queryKey),
    dehydratedAt: NOW,
    state: {
      data: {},
      dataUpdateCount: 1,
      dataUpdatedAt,
      error: null,
      errorUpdateCount: 0,
      errorUpdatedAt: 0,
      fetchFailureCount: 0,
      fetchFailureReason: null,
      fetchMeta: null,
      isInvalidated: false,
      status,
      fetchStatus: 'idle'
    }
  }
}

function client(queries: DehydratedQuery[]): PersistedClient {
  return { timestamp: NOW, buster: 'test', clientState: { queries, mutations: [] } }
}

const keys = (c: PersistedClient): unknown[] => c.clientState.queries.map(q => q.queryKey)

describe('offlineGroup', () => {
  it('maps persisted query families and ignores the rest', () => {
    expect(offlineGroup(['plate', 'AA1234BB'])).toBe('plate')
    expect(offlineGroup(['safety', 'euroncap', 'KIA', 'RIO', 2020])).toBe('safety')
    expect(offlineGroup(['search', 'brands', 'ki'])).toBeNull()
    expect(offlineGroup(['photos', 'KIA', 'RIO', 2020])).toBeNull()
    expect(offlineGroup(['history'])).toBeNull()
  })
})

describe('pruneOfflineClient', () => {
  it('drops entries older than the max age and non-success queries', () => {
    const pruned = pruneOfflineClient(
      client([
        query(['plate', 'FRESH'], NOW - 1000),
        query(['plate', 'OLD'], NOW - OFFLINE_MAX_AGE_MS - 1),
        query(['vin', 'ERR'], NOW, 'error'),
        query(['search', 'brands', 'x'], NOW)
      ]),
      new Set(),
      NOW
    )
    expect(keys(pruned)).toEqual([['plate', 'FRESH']])
  })

  it('keeps a plate and its history together, counted as one entity', () => {
    const queries = Array.from({ length: OFFLINE_LIMITS.plate + 5 }, (_, i) => [
      query(['plate', `P${i}`], NOW - i),
      query(['plate', `P${i}`, 'history'], NOW - i)
    ]).flat()
    const pruned = pruneOfflineClient(client(queries), new Set(), NOW)
    expect(pruned.clientState.queries).toHaveLength(OFFLINE_LIMITS.plate * 2)
    expect(keys(pruned)).toContainEqual(['plate', 'P0', 'history'])
    expect(keys(pruned)).not.toContainEqual(['plate', `P${OFFLINE_LIMITS.plate}`])
  })

  it('always keeps pinned favorites, even past the cap and max age', () => {
    const queries = [
      ...Array.from({ length: OFFLINE_LIMITS.vin }, (_, i) => query(['vin', `V${i}`], NOW - i)),
      query(['vin', 'FAV'], NOW - OFFLINE_MAX_AGE_MS * 3)
    ]
    const pruned = pruneOfflineClient(client(queries), new Set(['vin:FAV']), NOW)
    expect(pruned.clientState.queries).toHaveLength(OFFLINE_LIMITS.vin + 1)
    expect(keys(pruned)).toContainEqual(['vin', 'FAV'])
  })
})
