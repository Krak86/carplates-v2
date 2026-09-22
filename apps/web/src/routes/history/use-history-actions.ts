import { useMutation, useQueryClient } from '@tanstack/react-query'

import { clearVisits, deleteVisit } from '@/lib/history-db'
import { historyQuery } from '@/lib/queries'

type UseHistoryActions = {
  deleteOne: ReturnType<typeof useMutation<void, Error, string>>
  deleteAll: ReturnType<typeof useMutation<void, Error, void>>
}

export function useHistoryActions(): UseHistoryActions {
  const queryClient = useQueryClient()
  const invalidate = (): void => void queryClient.invalidateQueries({ queryKey: historyQuery().queryKey })

  const deleteOne = useMutation({ mutationFn: deleteVisit, onSuccess: invalidate })
  const deleteAll = useMutation({ mutationFn: clearVisits, onSuccess: invalidate })

  return { deleteOne, deleteAll }
}
