import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { addFavorite, favoriteId, removeFavorite } from '@/lib/favorites-db'
import type { FavoriteKind } from '@/lib/favorites-db'
import { favoriteQuery, favoritesQuery } from '@/lib/queries'

type UseFavoriteToggle = {
  isFavorite: boolean
  isPending: boolean
  toggle: () => void
}

export function useFavoriteToggle(kind: FavoriteKind, value: string, label: string | null): UseFavoriteToggle {
  const queryClient = useQueryClient()
  const favorite = useQuery(favoriteQuery(kind, value))

  const toggle = useMutation({
    mutationFn: async () => {
      if (favorite.data) await removeFavorite(favoriteId(kind, value))
      else await addFavorite(kind, value, label)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: favoriteQuery(kind, value).queryKey })
      void queryClient.invalidateQueries({ queryKey: favoritesQuery().queryKey })
    }
  })

  return { isFavorite: !!favorite.data, isPending: toggle.isPending, toggle: () => toggle.mutate() }
}
