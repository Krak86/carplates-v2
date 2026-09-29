import { useMutation, useQueryClient } from '@tanstack/react-query'

import { removeFavorite } from '@/lib/favorites-db'
import { favoritesQuery } from '@/lib/queries'
import { forgetSavedResults } from '@/lib/saved-results'

type UseFavoritesActions = {
  deleteOne: ReturnType<typeof useMutation<void, Error, string>>
}

export function useFavoritesActions(): UseFavoritesActions {
  const queryClient = useQueryClient()

  const deleteOne = useMutation({
    mutationFn: removeFavorite,
    networkMode: 'always',
    onSuccess: async (_, id) => {
      void queryClient.invalidateQueries({ queryKey: favoritesQuery().queryKey })
      await forgetSavedResults(queryClient, [id])
    }
  })

  return { deleteOne }
}
