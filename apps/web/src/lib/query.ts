import { QueryClient, onlineManager } from '@tanstack/react-query'

import { MaintenanceError } from '@/lib/api'
import { retryDelayQuery, retryQuery, setMaintenance } from '@/lib/maintenance'
import { OFFLINE_LIMITS } from '@/lib/offline-cache'
import type { OfflineGroup } from '@/lib/offline-cache'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: retryQuery,
      retryDelay: retryDelayQuery,
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false
    }
  }
})

// Show the "server is updating" banner while a query is being retried against a maintenance answer (not only after it
// gives up), and clear it as soon as any query succeeds again.
queryClient.getQueryCache().subscribe(event => {
  if (event.type !== 'updated') return
  if (event.action.type === 'failed' && event.action.error instanceof MaintenanceError) setMaintenance(true)
  else if (event.action.type === 'success') setMaintenance(false)
})

// Only queries still in memory get persisted — the default 5-min gcTime would silently drop
// every restored result the user doesn't revisit. Size is bounded by the persister's caps.
for (const group of Object.keys(OFFLINE_LIMITS) as OfflineGroup[]) {
  // eslint-disable-next-line @tanstack/query/prefer-query-options -- a key-prefix default for a whole query family, not one query
  queryClient.setQueryDefaults([group], { gcTime: Infinity })
}

// TanStack assumes online until the first `offline` event, which a cold start without network never fires.
onlineManager.setOnline(navigator.onLine)
