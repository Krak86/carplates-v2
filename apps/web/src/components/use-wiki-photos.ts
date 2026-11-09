import { useQuery } from '@tanstack/react-query'
import { resolveVehicleColor } from '@carplates/shared'
import type { WikiPhoto } from '@carplates/shared'

import { wikiPhotosQuery } from '@/lib/queries'

type Params = {
  brand: string | null
  model: string | null
  year: number | null
  /** Raw registry colour (`resolveVehicleColor` maps it). */
  color: string | null | undefined
}

type WikiPhotosState = {
  /** Extra photos, best first; empty on no scan, an error or offline (silent: they are decoration). */
  photos: readonly WikiPhoto[]
  /** The request is in flight (not paused offline), so the hero waits instead of flashing a photo it may replace. */
  loading: boolean
}

/** Extra Commons photos of the model for the hero pick and the strip (docs/wiki-recolor-plan.md, steps 7-8). Online only. */
export function useWikiPhotos({ brand, model, year, color }: Params): WikiPhotosState {
  const enabled = !!brand && !!model
  const query = useQuery({
    ...wikiPhotosQuery(brand ?? '', model ?? '', year, resolveVehicleColor(color)),
    enabled
  })
  return { photos: query.data?.photos ?? [], loading: enabled && query.isLoading }
}

/** The first photo whose real paint already matches the registry colour (it needs no filter), or null. */
export function firstColorMatch(photos: readonly WikiPhoto[], skip: ReadonlySet<string>): WikiPhoto | null {
  return photos.find(photo => photo.colorMatch && !skip.has(photo.url)) ?? null
}
