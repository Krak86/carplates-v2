import { onlineManager } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'

import { getDataVersion } from '@/lib/api'
import { listFavorites } from '@/lib/favorites-db'
import { getOne, openDb, runTx } from '@/lib/idb'
import { OFFLINE_LIMITS, offlineGroup, pruneOfflineClient } from '@/lib/offline-cache'
import type { OfflineGroup } from '@/lib/offline-cache'
import { capture } from '@/lib/telemetry'

const DB_NAME = 'carplates.offline'
const DB_VERSION = 1
const STORE = 'query-cache'
const RECORD_ID = 'client'
const THROTTLE_MS = 1000
const DATA_VERSION_KEY = 'carplates.dataVersion'
const USAGE_REPORTED_AT_KEY = 'carplates.offlineUsageReportedAt'
const USAGE_REPORT_INTERVAL_MS = 24 * 60 * 60 * 1000
const MB = 1024 * 1024
// Must match the runtimeCaching cacheName prefix in vite.config.ts.
const RUNTIME_CACHE_PREFIX = 'carplates-rt-'

type CacheRecord = { id: string; client: PersistedClient }

export type StorageEstimate = { usage: number; quota: number }

let pending: PersistedClient | null = null
let timer: ReturnType<typeof setTimeout> | null = null

async function write(client: PersistedClient): Promise<void> {
  const favorites = await listFavorites()
  const pruned = pruneOfflineClient(client, new Set(favorites.map(f => f.id)), Date.now())
  const db = await openDb(DB_NAME, DB_VERSION, STORE)
  await runTx(db, STORE, 'readwrite', store => store.put({ id: RECORD_ID, client: pruned } satisfies CacheRecord))
  db.close()
}

function flush(): void {
  if (timer) clearTimeout(timer)
  timer = null
  const client = pending
  pending = null
  if (client) write(client).catch(() => undefined)
}

/** IndexedDB-backed, stored as a structured clone (no JSON string), pruned to the offline caps on every write. */
export const queryPersister: Persister = {
  persistClient(client) {
    pending = client
    timer ??= setTimeout(flush, THROTTLE_MS)
  },
  async restoreClient() {
    try {
      const db = await openDb(DB_NAME, DB_VERSION, STORE)
      const record = await getOne<CacheRecord>(db, STORE, RECORD_ID)
      db.close()
      return record?.client
    } catch {
      return undefined
    }
  },
  async removeClient() {
    if (timer) clearTimeout(timer)
    timer = null
    pending = null
    try {
      const db = await openDb(DB_NAME, DB_VERSION, STORE)
      await runTx(db, STORE, 'readwrite', store => store.delete(RECORD_ID))
      db.close()
    } catch {
      /* private mode / disabled storage */
    }
  }
}

// A throttled write still pending when the tab is backgrounded or closed would otherwise be lost.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush()
})

/** After an ingest / ratings refresh, marks restored data stale so it refetches when next shown; the saved copy stays usable offline. */
export async function syncDataVersion(queryClient: QueryClient): Promise<void> {
  if (!onlineManager.isOnline()) return
  const version = await getDataVersion().catch(() => null)
  if (!version) return
  try {
    const previous = localStorage.getItem(DATA_VERSION_KEY)
    if (previous && previous !== version) {
      await queryClient.invalidateQueries({ predicate: query => offlineGroup(query.queryKey) !== null })
    }
    localStorage.setItem(DATA_VERSION_KEY, version)
  } catch {
    /* private mode / disabled storage */
  }
}

/** Drops runtime-cached images (car photos, logos, backgrounds). IndexedDB and the app shell precache are untouched —
 *  saved results are removed per entry from History / Favorites instead (see saved-results.ts). */
export async function clearCachedImages(): Promise<void> {
  if (!('caches' in window)) return
  const names = await caches.keys()
  await Promise.all(names.filter(name => name.startsWith(RUNTIME_CACHE_PREFIX)).map(name => caches.delete(name)))
}

export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (!navigator.storage?.estimate) return null
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return { usage, quota }
}

/** At most once a day — the data for tuning OFFLINE_LIMITS. No-op unless telemetry is enabled. */
export async function reportOfflineUsage(queryClient: QueryClient): Promise<void> {
  try {
    const last = Number(localStorage.getItem(USAGE_REPORTED_AT_KEY) ?? 0)
    if (Date.now() - last < USAGE_REPORT_INTERVAL_MS) return
    localStorage.setItem(USAGE_REPORTED_AT_KEY, String(Date.now()))
  } catch {
    return
  }

  const counts = Object.fromEntries(Object.keys(OFFLINE_LIMITS).map(group => [group, 0])) as Record<
    OfflineGroup,
    number
  >
  for (const query of queryClient.getQueryCache().getAll()) {
    const group = offlineGroup(query.queryKey)
    if (group && query.state.status === 'success') counts[group] += 1
  }
  const estimate = await getStorageEstimate()
  capture('offline_storage', {
    usageMb: estimate ? Math.round(estimate.usage / MB) : null,
    quotaMb: estimate ? Math.round(estimate.quota / MB) : null,
    persisted: (await navigator.storage?.persisted?.()) ?? null,
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    ...counts
  })
}
