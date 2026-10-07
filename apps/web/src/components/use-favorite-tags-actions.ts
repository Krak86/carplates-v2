import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toggleTag } from '@/lib/favorite-labels'
import { updateFavoriteTags } from '@/lib/favorites-db'
import { favoritesQuery } from '@/lib/queries'

type ToggleVars = { id: string; labelId: string }

/** Puts a label on / takes it off a favorite (local write; the sync hook pushes it to the account). */
export function useFavoriteTagsActions(): { toggle: (vars: ToggleVars) => void } {
  const queryClient = useQueryClient()

  const { mutate } = useMutation({
    networkMode: 'always',
    mutationFn: ({ id, labelId }: ToggleVars) => updateFavoriteTags(id, tags => toggleTag(tags, labelId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: favoritesQuery().queryKey })
  })

  return { toggle: mutate }
}
