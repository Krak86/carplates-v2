import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PAINT_HEX, resolveVehicleKind } from '@carplates/shared'

import PhotoZoomDialog from '@/components/PhotoZoomDialog'
import VehicleKindPlaceholder from '@/components/VehicleKindPlaceholder'
import UaAuctionHero from '@/components/ua-auctions/UaAuctionHero'
import { useCarHeroImageActions } from '@/components/use-car-hero-image-actions'
import { useWikiPhotos, firstColorMatch } from '@/components/use-wiki-photos'
import { useWikiRecolor } from '@/components/use-wiki-recolor'
import WikiRecolorCanvas from '@/components/WikiRecolorCanvas'
import { cn } from '@/lib/cn'
import { useUiStore } from '@/store/ui-store'

const SWIPE_MIN_PX = 40

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  /** Raw registry `kind` — drives the placeholder shown when no photo is found. */
  rawKind: string | null
  /** Same identity `useCarHeroImageActions` keys the ambient background override on — VIN when the
   *  result has one, otherwise the plate. */
  vehicleKey: string | null
  /** Prozorro.Sale lot photo ids of this very car: when present they lead one carousel, the model photo is its last slide (the real car beats a stock one). */
  lotPhotos?: readonly string[]
  /** Raw registry colour: the colour filter repaints the photo's car to it (no filter without one). */
  color?: string | null
}

/**
 * Fills the same hero slot a recognized/attached plate photo occupies (see `PhotoThumbnail`),
 * but with the car photo for its make/model/year (our stored copy first, Wikimedia as the server-side fallback) —
 * only rendered by the caller when no photo is attached. With lot photos, the lot carousel comes first and the
 * model photo follows below it as its own image.
 */
export default function WikiHeroImage({
  brand,
  model,
  year,
  rawKind,
  vehicleKey,
  lotPhotos = [],
  color = null
}: Props): ReactNode {
  const { t } = useTranslation()
  const { query: heroImage, refresh, isRefreshing } = useCarHeroImageActions({ brand, model, year, key: vehicleKey })
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(new Set())
  const wikiPhotos = useWikiPhotos({ brand, model, year, color })
  // A scanned photo whose real paint already matches the registry colour leads (no filter needed); it is another car of the model.
  // One that fails to load falls back to the stored hero + filter. While the photo list loads the hero waits, so it never flashes a photo it replaces.
  const usablePhotos = wikiPhotos.loading ? [] : wikiPhotos.photos.filter(photo => !failedUrls.has(photo.url))
  // A thumbnail the user picked leads over the automatic choice (an unfiltered other car of the model).
  const [pickedUrl, setPickedUrl] = useState<string | null>(null)
  const picked = usablePhotos.find(photo => photo.url === pickedUrl) ?? null
  const autoMatched = wikiPhotos.loading ? null : firstColorMatch(wikiPhotos.photos, failedUrls)
  const matched = picked ?? autoMatched
  const storedImage = heroImage.isSuccess && !wikiPhotos.loading ? heroImage.data.image : null
  const image = matched ? { url: matched.url, attribution: matched.attribution } : storedImage
  const creditParts = [image?.attribution?.author, image?.attribution?.license].filter(Boolean)

  const recolor = useWikiRecolor({
    brand,
    model,
    year,
    imageUrl: matched ? null : (image?.url ?? null),
    color
  })
  const colorName = recolor.target ? t(`vehicleColor.${recolor.target}`) : null
  const setRecolorEnabled = useUiStore(s => s.setWikiRecolorEnabled)
  const [zoomed, setZoomed] = useState(false)
  // Second slide = the untouched photo (filter applicable only): a swipe away from the repainted one, so the filter is easy to undo.
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const swipe = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const hasQuery = Boolean(brand || model)
  const isPending = hasQuery && (heroImage.isPending || wikiPhotos.loading)

  // With lot photos one carousel holds everything: the lot photos, then the model photo as its last slide
  // (a model photo that fails to load drops out of the carousel by itself).
  if (lotPhotos.length > 0) {
    return (
      <UaAuctionHero
        docIds={lotPhotos}
        label={[brand, model, year].filter(Boolean).join(' ')}
        modelPhoto={
          image && !failedUrls.has(image.url)
            ? {
                url: image.url,
                credit: creditParts.join(', ') || null,
                recolor:
                  recolor.target && colorName
                    ? {
                        mask: recolor.mask,
                        color: recolor.target,
                        colorName,
                        enabled: recolor.enabled,
                        onToggle: () => setRecolorEnabled(!recolor.enabled)
                      }
                    : null
              }
            : null
        }
      />
    )
  }

  // Settled with no image (or the image failed to load) → a kind placeholder in the same slot,
  // or nothing at all when the registry gave no recognizable kind (e.g. a VIN-only decode).
  if (!isPending && (!image || failedUrls.has(image.url))) {
    const kind = resolveVehicleKind(rawKind)
    return kind ? (
      <div className="hero-vt relative -my-3 h-64 w-full max-w-content sm:h-80">
        <VehicleKindPlaceholder kind={kind} />
      </div>
    ) : null
  }

  const isLoaded = !!image && loadedUrl === image.url
  const hasSlides = isLoaded && !!recolor.target
  const viewOriginal = hasSlides && originalUrl === image?.url
  const goSlide = (): void => setOriginalUrl(viewOriginal ? null : (image?.url ?? null))
  const onPointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    swipe.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY, moved: false }
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>): void => {
    const start = swipe.current
    if (!start || !hasSlides) return
    const dx = e.clientX - start.x
    if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
      start.moved = true
      goSlide()
    }
  }

  return (
    <>
      <div
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className="hero-vt relative -my-3 h-64 w-full max-w-content touch-pan-y sm:h-80"
      >
        {!isLoaded && (
          <div aria-hidden className="absolute inset-0 animate-pulse rounded-lg border border-border bg-surface/70" />
        )}
        {image && (
          <img
            src={image.url}
            alt={[brand, model].filter(Boolean).join(' ')}
            crossOrigin="anonymous"
            fetchPriority="high"
            decoding="async"
            onLoad={() => setLoadedUrl(image.url)}
            onError={() => setFailedUrls(prev => new Set(prev).add(image.url))}
            className={`h-full w-full rounded-lg object-cover transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        {isLoaded && !viewOriginal && recolor.mask && recolor.target && (
          <WikiRecolorCanvas mask={recolor.mask} color={recolor.target} />
        )}
        {isLoaded && image && (
          <>
            <button
              type="button"
              onClick={() => {
                if (!swipe.current?.moved) setZoomed(true)
              }}
              aria-label={t('photo.zoomOpen')}
              className="absolute inset-0 cursor-zoom-in rounded-lg"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
            >
              🔍
            </span>
          </>
        )}
        {image && !matched && heroImage.data?.from && (
          <div className="absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80">
            {heroImage.data.from === 'live' ? 'Wiki live' : 'DB'}
          </div>
        )}

        {hasSlides && (
          <>
            {([-1, 1] as const).map(step => (
              <button
                key={step}
                type="button"
                onClick={goSlide}
                aria-label={t(step < 0 ? 'uaAuctions.hero.prev' : 'uaAuctions.hero.next')}
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-2.5 py-1 text-lg leading-none text-white hover:bg-black/75',
                  step < 0 ? 'left-2' : 'right-2'
                )}
              >
                {step < 0 ? '‹' : '›'}
              </button>
            ))}
            <div className="pointer-events-none absolute bottom-9 left-1/2 flex -translate-x-1/2 gap-1.5">
              {[false, true].map(isOriginal => (
                <span
                  key={String(isOriginal)}
                  role="img"
                  aria-label={t('wiki.slideDot', { n: isOriginal ? 2 : 1, total: 2 })}
                  aria-current={isOriginal === viewOriginal}
                  className={cn(
                    'size-1.5 rounded-full bg-white',
                    isOriginal === viewOriginal ? 'opacity-100' : 'opacity-40'
                  )}
                />
              ))}
            </div>
          </>
        )}

        {isLoaded && !viewOriginal && recolor.target && colorName && (
          <button
            type="button"
            aria-pressed={recolor.enabled}
            onClick={() => setRecolorEnabled(!recolor.enabled)}
            className="absolute top-2 right-2 flex items-center gap-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80 hover:text-white"
          >
            <span
              aria-hidden
              className="size-2.5 rounded-full border border-white/60"
              style={{ backgroundColor: PAINT_HEX[recolor.target] }}
            />
            {t(recolor.enabled ? 'wiki.recolorOn' : 'wiki.recolorOff')}
          </button>
        )}

        {!matched && (
          <button
            type="button"
            onClick={refresh}
            disabled={isRefreshing}
            className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80 hover:text-white disabled:opacity-60"
          >
            {t(isRefreshing ? 'wiki.imageRefreshing' : 'wiki.imageRefresh')}
          </button>
        )}

        {isLoaded && creditParts.length > 0 && (
          <div className="absolute right-11 bottom-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80">
            {t(
              matched
                ? 'wiki.imageCreditOther'
                : recolor.mask && !viewOriginal
                  ? 'wiki.imageCreditModified'
                  : 'wiki.imageCredit',
              {
                credit: creditParts.join(', ')
              }
            )}
          </div>
        )}
      </div>
      {zoomed && image && (
        <PhotoZoomDialog url={image.url} candidates={[]} active={null} onClose={() => setZoomed(false)} />
      )}
      {image && (hasSlides || usablePhotos.length > 0) && (
        <ul className="mt-4 flex w-full max-w-content gap-1.5 overflow-x-auto pb-1">
          {(hasSlides ? [false, true] : []).map(isOriginal => (
            <li key={String(isOriginal)} className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPickedUrl(null)
                  setOriginalUrl(isOriginal ? image.url : null)
                }}
                aria-label={t('wiki.slideDot', { n: isOriginal ? 2 : 1, total: 2 })}
                aria-current={isOriginal === viewOriginal}
                className={cn(
                  'relative block h-12 w-16 overflow-hidden rounded-md border-2 transition-opacity',
                  isOriginal === viewOriginal ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                )}
              >
                <img
                  src={image.url}
                  alt=""
                  crossOrigin="anonymous"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                {!isOriginal && recolor.mask && recolor.target && (
                  <WikiRecolorCanvas mask={recolor.mask} color={recolor.target} testId="wiki-recolor-canvas-thumb" />
                )}
              </button>
            </li>
          ))}
          {picked && storedImage && !autoMatched && !hasSlides && (
            <li className="shrink-0">
              <button
                type="button"
                onClick={() => setPickedUrl(null)}
                aria-label={t('wiki.photoStored')}
                className="block h-12 w-16 overflow-hidden rounded-md border-2 border-transparent opacity-70 transition-opacity hover:opacity-100"
              >
                <img
                  src={storedImage.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          )}
          {usablePhotos.map((photo, i) => {
            const isActive = matched?.url === photo.url
            return (
              <li key={photo.url} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setPickedUrl(photo.url)}
                  aria-label={t('wiki.photoOpen', { n: i + 1, total: usablePhotos.length })}
                  aria-current={isActive}
                  className={cn(
                    'block h-12 w-16 overflow-hidden rounded-md border-2 transition-opacity',
                    isActive ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                  )}
                >
                  <img
                    src={photo.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailedUrls(prev => new Set(prev).add(photo.url))}
                    className="h-full w-full object-cover"
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
