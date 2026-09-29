import { useMutation, useQueryClient } from '@tanstack/react-query'

import { clearVisits, deleteVisit, listVisits } from '@/lib/history-db'
import { historyQuery } from '@/lib/queries'
import { forgetSavedResults } from '@/lib/saved-results'

type UseHistoryActions = {
  deleteOne: ReturnType<typeof useMutation<void, Error, string>>
  deleteAll: ReturnType<typeof useMutation<string[], Error, void>>
}

export function useHistoryActions(): UseHistoryActions {
  const queryClient = useQueryClient()
  const invalidate = (): void => void queryClient.invalidateQueries({ queryKey: historyQuery().queryKey })

  const deleteOne = useMutation({
    mutationFn: deleteVisit,
    networkMode: 'always',
    onSuccess: async (_, id) => {
      invalidate()
      await forgetSavedResults(queryClient, [id])
    }
  })
  const deleteAll = useMutation({
    mutationFn: async () => {
      const ids = (await listVisits()).map(entry => entry.id)
      await clearVisits()
      return ids
    },
    networkMode: 'always',
    onSuccess: async ids => {
      invalidate()
      await forgetSavedResults(queryClient, ids)
    }
  })

  return { deleteOne, deleteAll }
}
