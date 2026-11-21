import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { commonsThumbUrl, HERO_THUMB_WIDTH, PAINT_HEX, resolveVehicleKind } from '@carplates/shared'

import PhotoZoomDialog from '@/components/PhotoZoomDialog'
import VehicleKindPlaceholder from '@/components/VehicleKindPlaceholder'
import StripThumb from '@/components/StripThumb'
import UaAuctionHero from '@/components/ua-auctions/UaAuctionHero'
import { useCarHeroImageActions } from '@/components/use-car-hero-image-actions'
import { useWikiPhotos, firstColorMatch } from '@/components/use-wiki-photos'
import { useWikiRecolor } from '@/components/use-wiki-recolor'
import WikiRecolorCanvas from '@/components/WikiRecolorCanvas'
import { cn } from '@/lib/cn'
import { useUiStore } from '@/store/ui-store'

const SWIPE_MIN_PX = 40

type Slide = { key: string; url?: string }

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
  // One that fails to load falls back to the stored hero + filter. The stored hero never waits for the photo list (that would put
  // the list request in front of the LCP image): it paints at once and a colour match, if one arrives, replaces it once loaded.
  const usablePhotos = wikiPhotos.loading ? [] : wikiPhotos.photos.filter(photo => !failedUrls.has(photo.url))
  // A thumbnail the user picked leads over the automatic choice (an unfiltered other car of the model).
  const [pickedUrl, setPickedUrl] = useState<string | null>(null)
  const picked = usablePhotos.find(photo => photo.url === pickedUrl) ?? null
  const autoMatched = wikiPhotos.loading ? null : firstColorMatch(wikiPhotos.photos, failedUrls)
  const matched = picked ?? autoMatched
  const storedImage = heroImage.isSuccess ? heroImage.data.image : null
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
  const isPending = hasQuery && heroImage.isPending

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
  // Some hero photo has painted: the strip below fetches its thumbnails only now, so they never compete with the LCP image.
  const heroReady = loadedUrl !== null
  const hasSlides = isLoaded && !!recolor.target
  const viewOriginal = hasSlides && originalUrl === image?.url
  // One flat slide list drives the arrows, dots and swipe: the repainted + original pair (filter applicable), the stored photo, the scanned photos.
  const slides: Slide[] = [
    ...(hasSlides ? [{ key: 'filtered' }, { key: 'original' }] : []),
    ...(storedImage && !autoMatched && !hasSlides ? [{ key: 'stored' }] : []),
    ...usablePhotos.map(photo => ({ key: photo.url, url: photo.url }))
  ]
  const foundActive = slides.findIndex(slide =>
    matched
      ? slide.url === matched.url
      : slide.key === (hasSlides ? (viewOriginal ? 'original' : 'filtered') : 'stored')
  )
  const active = Math.max(foundActive, 0)
  const select = (slide: Slide): void => {
    setPickedUrl(slide.url ?? null)
    setOriginalUrl(slide.key === 'original' ? (image?.url ?? null) : null)
  }
  const goStep = (step: -1 | 1): void => {
    const next = slides[(active + step + slides.length) % slides.length]
    if (next) select(next)
  }
  // Keeps the active thumbnail centred in the (hand-unscrollable) strip; it runs on commit, never during render.
  const centerInStrip = (li: HTMLLIElement | null): void => {
    const strip = li?.parentElement
    if (!li || !strip) return
    strip.scrollLeft = li.offsetLeft - (strip.clientWidth - li.offsetWidth) / 2
  }
  const onPointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    swipe.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY, moved: false }
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>): void => {
    const start = swipe.current
    if (!start || slides.length < 2) return
    const dx = e.clientX - start.x
    if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
      start.moved = true
      goStep(dx < 0 ? 1 : -1)
    }
  }

  return (
    <>
      <div
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className="hero-vt relative -my-3 h-64 w-full max-w-content touch-pan-y sm:h-80"
      >
        {!heroReady && (
          <div aria-hidden className="absolute inset-0 animate-pulse rounded-lg border border-border bg-surface/70" />
        )}
        {/* A photo that replaces the one on screen (a colour match arriving late) loads on top of it: no blank flash in between. */}
        {!isLoaded && loadedUrl && (
          <img
            src={loadedUrl}
            alt=""
            aria-hidden
            decoding="async"
            className="absolute inset-0 h-full w-full rounded-lg object-cover"
          />
        )}
        {image && (
          <img
            src={commonsThumbUrl(image.url, HERO_THUMB_WIDTH)}
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

        {slides.length > 1 && (
          <>
            {([-1, 1] as const).map(step => (
              <button
                key={step}
                type="button"
                onClick={() => goStep(step)}
                aria-label={t(step < 0 ? 'uaAuctions.hero.prev' : 'uaAuctions.hero.next')}
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-2.5 py-1 text-lg leading-none text-white hover:bg-black/75',
                  step < 0 ? 'left-2' : 'right-2'
                )}
              >
                {step < 0 ? '‹' : '›'}
              </button>
            ))}
            <div className="absolute bottom-9 left-1/2 flex max-w-[70%] -translate-x-1/2 flex-wrap justify-center">
              {slides.map((slide, i) => (
                <button
                  key={slide.key}
                  type="button"
                  onClick={() => select(slide)}
                  aria-label={t('wiki.slideDot', { n: i + 1, total: slides.length })}
                  aria-current={i === active}
                  className="group p-1"
                >
                  <span
                    className={cn(
                      'block size-1.5 rounded-full bg-white group-hover:opacity-100',
                      i === active ? 'opacity-100' : 'opacity-40'
                    )}
                  />
                </button>
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
      {/* One fixed-height row that never scrolls by hand (no scrollbar, no layout shift): the arrows, dots and swipe on the
          hero move through the photos and the row follows the active thumbnail. Same-size placeholders until the hero has
          painted (its thumbnails are fetched only then, so they never compete with the LCP image). */}
      {(image || isPending) && (
        <ul className="relative mt-4 flex h-13 w-full max-w-content gap-1.5 overflow-hidden pb-1">
          {!image || !heroReady
            ? [0, 1, 2].map(n => (
                <li key={n} aria-hidden className="shrink-0">
                  <div className="h-12 w-16 animate-pulse rounded-md border-2 border-transparent bg-border" />
                </li>
              ))
            : slides.map((slide, i) => {
                const isActive = i === active
                return (
                  <li key={slide.key} ref={isActive ? centerInStrip : undefined} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => select(slide)}
                      aria-label={t('wiki.photoOpen', { n: i + 1, total: slides.length })}
                      aria-current={isActive}
                      className={cn(
                        'relative block h-12 w-16 overflow-hidden rounded-md border-2 transition-opacity',
                        isActive ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                      )}
                    >
                      <StripThumb
                        url={slide.url ?? image.url}
                        onError={
                          slide.url ? (): void => setFailedUrls(prev => new Set(prev).add(slide.url!)) : undefined
                        }
                      />
                      {slide.key === 'filtered' && recolor.mask && recolor.target && (
                        <WikiRecolorCanvas
                          mask={recolor.mask}
                          color={recolor.target}
                          testId="wiki-recolor-canvas-thumb"
                        />
                      )}
                    </button>
                  </li>
                )
              })}
        </ul>
      )}
    </>
  )
}
