import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import type { WikiImageResponse } from '@carplates/shared'

import { getWikiImage } from '@/lib/api'
import { wikiImageQuery } from '@/lib/queries'
import { useBackgroundStore } from '@/store/background-store'

type Params = {
  brand: string | null
  model: string | null
  /** Model year — selects a photo of the matching generation rather than the article's newest one. */
  year: number | null
  /** Identifies the result this override is scoped to — VIN when the row has one, otherwise
   *  the plate (e.g. plates with an empty `vin` column, common pre-2026 data). Null means
   *  there's no result to key on, so the override never fires. */
  key: string | null
}

/**
 * Fetches the hero photo for a brand/model/year — our stored `wiki_image` row first, a live
 * Commons/Wikipedia lookup only when nothing is stored (all server-side). No article text: that
 * loads on demand when the Wikipedia section is opened. Once a photo resolves it is swapped in as
 * the ambient background in place of the rotation; the override is cleared on unmount so leaving
 * this result reverts to the rotation automatically.
 */
export function useCarHeroImageActions({ brand, model, year, key }: Params): {
  query: UseQueryResult<WikiImageResponse>
  refresh: () => void
  isRefreshing: boolean
} {
  const hasQuery = Boolean(brand || model)
  const options = wikiImageQuery(brand ?? '', model ?? '', year)
  const heroImage = useQuery({ ...options, enabled: hasQuery })
  const queryClient = useQueryClient()
  // On-demand update: the server re-fetches from Wikimedia and replaces its stored photo.
  const refreshMutation = useMutation({
    mutationFn: () => getWikiImage(brand ?? '', model ?? '', year, false, 0, true),
    onSuccess: data => {
      // Keep the current photo when the refresh found nothing.
      if (data.image) queryClient.setQueryData(options.queryKey, data)
    }
  })
  const setHeroOverride = useBackgroundStore(s => s.setHeroOverride)
  const clearHeroOverride = useBackgroundStore(s => s.clearHeroOverride)
  const image = heroImage.data?.image

  useEffect(() => {
    if (!key || !image) return
    setHeroOverride({ key, css: `url(${image.url})`, sourceUrl: null, attribution: image.attribution })
    return (): void => clearHeroOverride(key)
  }, [key, image, setHeroOverride, clearHeroOverride])

  return { query: heroImage, refresh: () => refreshMutation.mutate(), isRefreshing: refreshMutation.isPending }
}
