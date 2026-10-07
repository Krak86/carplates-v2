import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { showcaseModels, type WikiImage } from '@carplates/shared'

import { pickRandom } from '@/lib/new-cars'
import { showcaseImageQuery } from '@/lib/queries'

type Options = {
  /** How many of the brand's showcase models are probed (each one is a cached lookup). */
  probe: number
  /** How many distinct photos are wanted at most. */
  take: number
}

export type ShowcaseItem = { model: string; image: WikiImage }

type Showcase = {
  /** Distinct photos (by URL), at most `take` — fewer when the brand has fewer. */
  items: ShowcaseItem[]
  /** Still looking — callers wait instead of popping in a half-filled row first. */
  isPending: boolean
}

/**
 * Photos of current-year models of `brand` for the new-cars widget / section: a few random showcase models are tried for
 * this calendar year, and the previous year only for the models that had no photo and only while fewer than `take` were
 * found. The server answers from `registry.wiki_image` (Commons, hotlinked) and stores what it finds, so repeat views cost nothing.
 */
export function useNewCarsShowcaseActions(brand: string, enabled: boolean, { probe, take }: Options): Showcase {
  const [models] = useState(() => pickRandom(showcaseModels(brand), probe))
  const year = new Date().getFullYear()

  const current = useQueries({ queries: models.map(model => ({ ...showcaseImageQuery(brand, model, year), enabled })) })
  const currentSettled = current.every(q => !q.isPending)
  const currentFound = current.filter(q => !!q.data?.image).length

  const previous = useQueries({
    queries: models.map((model, i) => ({
      ...showcaseImageQuery(brand, model, year - 1),
      enabled: enabled && currentSettled && currentFound < take && !current[i]?.data?.image
    }))
  })

  const items: ShowcaseItem[] = []
  const seen = new Set<string>()
  models.forEach((model, i) => {
    const image = current[i]?.data?.image ?? previous[i]?.data?.image
    if (!image || seen.has(image.url) || items.length >= take) return
    seen.add(image.url)
    items.push({ model, image })
  })

  const isPending = enabled && (!currentSettled || previous.some(q => q.fetchStatus === 'fetching'))
  return { items, isPending }
}
