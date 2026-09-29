import { useIsRestoring, useQueryClient } from '@tanstack/react-query'

import type { HistoryKind } from '@/lib/history-db'
import { plateQuery, vinQuery } from '@/lib/queries'

/** Whether a plate/VIN result is in the (restored) query cache, i.e. openable without a connection. */
export function useOfflineAvailability(): (kind: HistoryKind, value: string) => boolean {
  const queryClient = useQueryClient()
  const isRestoring = useIsRestoring()

  return (kind, value) => {
    if (isRestoring) return false
    const { queryKey } = kind === 'plate' ? plateQuery(value) : vinQuery(value)
    return queryClient.getQueryData(queryKey) !== undefined
  }
}
