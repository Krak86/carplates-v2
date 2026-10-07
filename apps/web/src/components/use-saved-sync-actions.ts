import { useEffect, useRef } from 'react'
import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SyncResponse } from '@carplates/shared'

import { useSession } from '@/components/auth/use-session'
import { syncSaved } from '@/lib/api'
import { applySyncedFavorites, exportFavoritesForSync } from '@/lib/favorites-db'
import { applySyncedVisits, exportVisitsForSync } from '@/lib/history-db'
import { favoritesQuery, historyQuery } from '@/lib/queries'
import { SAVED_CHANGED_EVENT, notifySavedChanged } from '@/lib/saved-events'
import { useSyncStore } from '@/store/sync-store'

export const SYNC_MUTATION_KEY = ['sync', 'saved'] as const

/** A local change is pushed this long after the last one, so a burst of edits is one request. */
const PUSH_DEBOUNCE_MS = 1500
/** Returning to the tab / coming back online re-syncs, but not more often than this. */
const MIN_PULL_INTERVAL_MS = 60_000
/** Mirrors the request schema's per-list cap. */
const MAX_ENTRIES = 1000

async function runSync(): Promise<SyncResponse> {
  const [favorites, history] = await Promise.all([exportFavoritesForSync(), exportVisitsForSync()])
  const newest = <T extends { date: number }>(entries: T[]): T[] =>
    entries.length > MAX_ENTRIES ? entries.sort((a, b) => b.date - a.date).slice(0, MAX_ENTRIES) : entries
  const response = await syncSaved({ favorites: newest(favorites), history: newest(history) })
  await Promise.all([applySyncedFavorites(response.favorites), applySyncedVisits(response.history)])
  return response
}

/** True while a favorites/history sync is in flight — the add/remove buttons disable themselves meanwhile. */
export function useIsSyncing(): boolean {
  return useIsMutating({ mutationKey: SYNC_MUTATION_KEY }) > 0
}

/**
 * Keeps the signed-in user's favorites + history in step across devices. Syncs on sign-in, shortly after every
 * local change, on coming back online and on returning to the tab. Conflicts resolve server-side, last write
 * (newest `date`) wins per entry. Anonymous and offline users stay purely local.
 */
export function useSavedSyncActions(): void {
  const { user } = useSession()
  const userId = user?.id ?? null
  const queryClient = useQueryClient()
  const setTrimmedFavorites = useSyncStore(s => s.setTrimmedFavorites)
  const lastRunAt = useRef(0)
  const dirty = useRef(false)

  const { mutate } = useMutation({
    mutationKey: SYNC_MUTATION_KEY,
    networkMode: 'always',
    mutationFn: runSync,
    onSuccess: response => {
      void queryClient.invalidateQueries({ queryKey: favoritesQuery().queryKey })
      void queryClient.invalidateQueries({ queryKey: historyQuery().queryKey })
      void queryClient.invalidateQueries({ predicate: query => query.queryKey[0] === 'favorite' })
      if (response.evictedFavorites > 0) setTrimmedFavorites(response.evictedFavorites)
    },
    onSettled: () => {
      // A change landed while the request was in flight — push it in a follow-up round.
      if (!dirty.current) return
      dirty.current = false
      notifySavedChanged()
    }
  })

  useEffect(() => {
    if (!userId) return

    let timer: ReturnType<typeof setTimeout> | undefined
    const run = (): void => {
      if (queryClient.isMutating({ mutationKey: SYNC_MUTATION_KEY }) > 0) {
        dirty.current = true
        return
      }
      lastRunAt.current = Date.now()
      mutate()
    }
    const handleSavedChanged = (): void => {
      clearTimeout(timer)
      timer = setTimeout(run, PUSH_DEBOUNCE_MS)
    }
    const handleOnline = (): void => run()
    const handleVisibility = (): void => {
      if (document.visibilityState === 'visible' && Date.now() - lastRunAt.current > MIN_PULL_INTERVAL_MS) run()
    }

    run()
    window.addEventListener(SAVED_CHANGED_EVENT, handleSavedChanged)
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearTimeout(timer)
      window.removeEventListener(SAVED_CHANGED_EVENT, handleSavedChanged)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [userId, queryClient, mutate])
}
