import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useIsSyncing } from '@/components/use-saved-sync-actions'
import { addFavorite, favoriteId, removeFavorite } from '@/lib/favorites-db'
import type { FavoriteKind } from '@/lib/favorites-db'
import { favoriteQuery, favoritesQuery } from '@/lib/queries'
import { useSyncStore } from '@/store/sync-store'

type UseFavoriteToggle = {
  isFavorite: boolean
  isPending: boolean
  toggle: () => void
}

export function useFavoriteToggle(kind: FavoriteKind, value: string, label: string | null): UseFavoriteToggle {
  const queryClient = useQueryClient()
  const favorite = useQuery(favoriteQuery(kind, value))
  const isSyncing = useIsSyncing()
  const setTrimmedFavorites = useSyncStore(s => s.setTrimmedFavorites)

  const toggle = useMutation({
    networkMode: 'always',
    mutationFn: async () => {
      if (favorite.data) await removeFavorite(favoriteId(kind, value))
      else {
        const evicted = await addFavorite(kind, value, label)
        if (evicted.length) setTrimmedFavorites(evicted.length)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: favoriteQuery(kind, value).queryKey })
      void queryClient.invalidateQueries({ queryKey: favoritesQuery().queryKey })
    }
  })

  return { isFavorite: !!favorite.data, isPending: toggle.isPending || isSyncing, toggle: () => toggle.mutate() }
}
