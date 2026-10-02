import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useCarWikiActions } from '@/components/use-car-wiki-actions'

type Props = {
  brand: string | null
  model: string | null
  /** Same identity `useCarWikiActions` keys the ambient background override on — VIN when the
   *  result has one, otherwise the plate. */
  vehicleKey: string | null
}

/**
 * Fills the same hero slot a recognized/attached plate photo occupies (see `PhotoThumbnail`),
 * but with the car's Wikipedia main image — only rendered by the caller when no photo is attached.
 */
export default function WikiHeroImage({ brand, model, vehicleKey }: Props): ReactNode {
  const { t } = useTranslation()
  const wiki = useCarWikiActions({ brand, model, key: vehicleKey })
  const data = wiki.isSuccess ? wiki.data : null
  const image = data?.image
  const creditParts = [image?.attribution?.author, image?.attribution?.license].filter(Boolean)

  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const hasQuery = Boolean(brand || model)
  const isPending = hasQuery && wiki.isPending

  // Settled with no image (or the image failed to load) → collapse the space entirely.
  if (!isPending && (!image || failedUrl === image.url)) return null

  const isLoaded = !!image && loadedUrl === image.url

  return (
    <div className="relative -my-3 h-64 w-full max-w-2xl sm:h-80">
      {!isLoaded && <div className="absolute inset-0 animate-pulse rounded-lg bg-black/10 dark:bg-white/10" />}
      {image && (
        <img
          src={image.url}
          alt={data?.title ?? ''}
          crossOrigin="anonymous"
          onLoad={() => setLoadedUrl(image.url)}
          onError={() => setFailedUrl(image.url)}
          className={`h-full w-full rounded-lg object-cover transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {isLoaded && creditParts.length > 0 && (
        <div className="absolute right-2 bottom-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80">
          {t('wiki.imageCredit', { credit: creditParts.join(', ') })}
        </div>
      )}
    </div>
  )
}
