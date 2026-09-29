import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { clearCachedImages } from '@/lib/offline-storage'
import type { StorageEstimate } from '@/lib/offline-storage'
import { storageEstimateQuery } from '@/lib/queries'

type UseOfflineDataActions = {
  estimate: StorageEstimate | null | undefined
  isClearing: boolean
  clear: () => void
}

export function useOfflineDataActions(): UseOfflineDataActions {
  const queryClient = useQueryClient()
  const estimate = useQuery(storageEstimateQuery())

  const clear = useMutation({
    networkMode: 'always',
    mutationFn: clearCachedImages,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: storageEstimateQuery().queryKey })
  })

  return { estimate: estimate.data, isClearing: clear.isPending, clear: () => clear.mutate() }
}
