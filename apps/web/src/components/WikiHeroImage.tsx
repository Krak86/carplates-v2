import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveVehicleKind } from '@carplates/shared'

import VehicleKindPlaceholder from '@/components/VehicleKindPlaceholder'
import { useCarHeroImageActions } from '@/components/use-car-hero-image-actions'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  /** Raw registry `kind` — drives the placeholder shown when no photo is found. */
  rawKind: string | null
  /** Same identity `useCarHeroImageActions` keys the ambient background override on — VIN when the
   *  result has one, otherwise the plate. */
  vehicleKey: string | null
}

/**
 * Fills the same hero slot a recognized/attached plate photo occupies (see `PhotoThumbnail`),
 * but with the car photo for its make/model/year (our stored copy first, Wikimedia as the server-side fallback) —
 * only rendered by the caller when no photo is attached.
 */
export default function WikiHeroImage({ brand, model, year, rawKind, vehicleKey }: Props): ReactNode {
  const { t } = useTranslation()
  const heroImage = useCarHeroImageActions({ brand, model, year, key: vehicleKey })
  const image = heroImage.isSuccess ? heroImage.data.image : null
  const creditParts = [image?.attribution?.author, image?.attribution?.license].filter(Boolean)

  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const hasQuery = Boolean(brand || model)
  const isPending = hasQuery && heroImage.isPending

  // Settled with no image (or the image failed to load) → a kind placeholder in the same slot,
  // or nothing at all when the registry gave no recognizable kind (e.g. a VIN-only decode).
  if (!isPending && (!image || failedUrl === image.url)) {
    const kind = resolveVehicleKind(rawKind)
    return kind ? (
      <div className="hero-vt relative -my-3 h-64 w-full max-w-content sm:h-80">
        <VehicleKindPlaceholder kind={kind} />
      </div>
    ) : null
  }

  const isLoaded = !!image && loadedUrl === image.url

  return (
    <div className="hero-vt relative -my-3 h-64 w-full max-w-content sm:h-80">
      {!isLoaded && <div className="absolute inset-0 animate-pulse rounded-lg bg-black/10 dark:bg-white/10" />}
      {image && (
        <img
          src={image.url}
          alt={[brand, model].filter(Boolean).join(' ')}
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
