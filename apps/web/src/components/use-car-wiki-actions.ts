import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { WikiInfo } from '@carplates/shared'

import { wikiInfoQuery } from '@/lib/queries'
import { useBackgroundStore } from '@/store/background-store'

type Params = {
  brand: string | null
  model: string | null
  /** Identifies the result this override is scoped to — VIN when the row has one, otherwise
   *  the plate (e.g. plates with an empty `vin` column, common pre-2026 data). Null means
   *  there's no result to key on, so the override never fires. */
  key: string | null
}

/**
 * Fetches the Wikipedia summary for a brand/model in the background (not gated behind a UI
 * toggle — `CarWikiInfo` only gates whether the *result* is shown, not the fetch itself), and,
 * once a car image resolves, swaps it in as the ambient background in place of the rotation.
 * The override is cleared on unmount so leaving this result reverts to the rotation automatically.
 */
export function useCarWikiActions({ brand, model, key }: Params): UseQueryResult<WikiInfo> {
  const { i18n } = useTranslation()
  const hasQuery = Boolean(brand || model)
  const wiki = useQuery({ ...wikiInfoQuery(brand ?? '', model ?? '', i18n.language), enabled: hasQuery })
  const setHeroOverride = useBackgroundStore(s => s.setHeroOverride)
  const clearHeroOverride = useBackgroundStore(s => s.clearHeroOverride)
  const image = wiki.data?.image

  useEffect(() => {
    if (!key || !image) return
    setHeroOverride({ key, css: `url(${image.url})`, sourceUrl: wiki.data?.pageUrl ?? null, attribution: image.attribution })
    return (): void => clearHeroOverride(key)
  }, [key, image, wiki.data?.pageUrl, setHeroOverride, clearHeroOverride])

  return wiki
}
