import { useMutation, useQueryClient } from '@tanstack/react-query'

import { removeFavorite } from '@/lib/favorites-db'
import { favoritesQuery } from '@/lib/queries'

type UseFavoritesActions = {
  deleteOne: ReturnType<typeof useMutation<void, Error, string>>
}

export function useFavoritesActions(): UseFavoritesActions {
  const queryClient = useQueryClient()

  const deleteOne = useMutation({
    mutationFn: removeFavorite,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: favoritesQuery().queryKey })
  })

  return { deleteOne }
}
