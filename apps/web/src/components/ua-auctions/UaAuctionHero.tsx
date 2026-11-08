import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PAINT_HEX, prozorroDocumentUrl } from '@carplates/shared'
import type { VehicleColor } from '@carplates/shared'

import PhotoZoomDialog from '@/components/PhotoZoomDialog'
import WikiRecolorCanvas from '@/components/WikiRecolorCanvas'
import { useSwipeSlide } from '@/hooks/useSwipeSlide'
import { cn } from '@/lib/cn'

/** Stock photo of the car's make/model, shown as the last slide after the lot photos. */
type ModelPhoto = {
  url: string
  credit: string | null
  /** Colour filter of the model photo (docs/wiki-recolor-plan.md): when set the photo gets two slides, repainted then original. */
  recolor?: {
    /** Decoded mask, null while the filter is off or the mask is loading. */
    mask: { w: number; h: number; data: Uint8ClampedArray } | null
    color: VehicleColor
    colorName: string
    enabled: boolean
    onToggle: () => void
  } | null
}

type Slide = { key: string; src: string; isModel: boolean }

const MODEL_KEY = 'model'
const MODEL_ORIGINAL_KEY = 'model-original'

type Props = {
  /** Prozorro document ids (32 hex), one per photo file. */
  docIds: readonly string[]
  /** Names the photos for screen readers, e.g. the vehicle. */
  label: string
  /** Model photo appended after the lot photos (a cleaner view of the model, not of this car). */
  modelPhoto?: ModelPhoto | null
}

/**
 * Hero slot filled with photos of the car from its Prozorro.Sale lots: one large picture, arrows and a thumbnail strip to
 * switch. Lot photos are captioned as such (the car may have changed since); the optional model photo comes last with its own caption
 * and credit. A photo that fails to load drops out of the list.
 */
export default function UaAuctionHero({ docIds, label, modelPhoto = null }: Props): ReactNode {
  const { t } = useTranslation()
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set())
  const [index, setIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)

  const slides: Slide[] = [
    ...docIds.map(id => ({ key: id, src: prozorroDocumentUrl(id), isModel: false })),
    ...(modelPhoto ? [{ key: MODEL_KEY, src: modelPhoto.url, isModel: true }] : []),
    ...(modelPhoto?.recolor ? [{ key: MODEL_ORIGINAL_KEY, src: modelPhoto.url, isModel: true }] : [])
  ].filter(slide => !failed.has(slide.key))
  const { slideRef, slideClass, bind, step, wasSwipe } = useSwipeSlide<HTMLImageElement, HTMLDivElement>(
    slides.length > 1,
    d => setIndex(i => (Math.min(i, slides.length - 1) + d + slides.length) % slides.length)
  )
  if (slides.length === 0) return null
  const current = Math.min(index, slides.length - 1)
  const slide = slides[current] as Slide
  const lotCount = slides.filter(s => !s.isModel).length
  const recolor = slide.key === MODEL_KEY ? (modelPhoto?.recolor ?? null) : null
  const go = (step: number): void => setIndex((current + step + slides.length) % slides.length)
  // Both model slides share one file: it drops out of the carousel as a whole.
  const fail = (key: string): void =>
    setFailed(prev =>
      new Set(prev).add(key).add(key === MODEL_KEY ? MODEL_ORIGINAL_KEY : key === MODEL_ORIGINAL_KEY ? MODEL_KEY : key)
    )
  const caption = recolor
    ? modelPhoto?.credit
      ? t('uaAuctions.hero.modelCaptionFilterCredit', {
          color: recolor.colorName.toLowerCase(),
          credit: modelPhoto.credit
        })
      : t('uaAuctions.hero.modelCaptionFilter', { color: recolor.colorName.toLowerCase() })
    : slide.isModel
      ? modelPhoto?.credit
        ? t('uaAuctions.hero.modelCaptionCredit', { credit: modelPhoto.credit })
        : t('uaAuctions.hero.modelCaption')
      : t('uaAuctions.hero.caption', { n: current + 1, total: lotCount })
  return (
    <div className="hero-vt w-full max-w-content space-y-1.5">
      <div
        {...bind}
        className="relative h-64 touch-pan-y overflow-hidden rounded-lg border border-border bg-surface/70 sm:h-80"
      >
        <button
          type="button"
          onClick={() => {
            if (!wasSwipe()) setZoomed(true)
          }}
          aria-label={t('uaAuctions.photo.open', { n: current + 1, total: slides.length })}
          className="block h-full w-full cursor-zoom-in"
        >
          <img
            key={slide.key}
            ref={slideRef}
            src={slide.src}
            alt={t('uaAuctions.photo.alt', { label, n: current + 1 })}
            fetchPriority="high"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => fail(slide.key)}
            draggable={false}
            className={cn('h-full w-full object-cover will-change-transform', slideClass)}
          />
        </button>

        {recolor?.mask && <WikiRecolorCanvas mask={recolor.mask} color={recolor.color} />}

        {recolor && (
          <button
            type="button"
            aria-pressed={recolor.enabled}
            onClick={recolor.onToggle}
            className="absolute top-2 right-2 flex items-center gap-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80 hover:text-white"
          >
            <span
              aria-hidden
              className="size-2.5 rounded-full border border-white/60"
              style={{ backgroundColor: PAINT_HEX[recolor.color] }}
            />
            {t(recolor.enabled ? 'wiki.recolorOn' : 'wiki.recolorOff')}
          </button>
        )}

        {slides.length > 1 &&
          ([-1, 1] as const).map(dir => (
            <button
              key={dir}
              type="button"
              onClick={() => step(dir)}
              aria-label={t(dir < 0 ? 'uaAuctions.hero.prev' : 'uaAuctions.hero.next')}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-2.5 py-1 text-lg leading-none text-white hover:bg-black/75',
                dir < 0 ? 'left-2' : 'right-2'
              )}
            >
              {dir < 0 ? '‹' : '›'}
            </button>
          ))}

        <span
          aria-hidden
          className="pointer-events-none absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
        >
          🔍
        </span>

        <div className="absolute bottom-2 left-2 max-w-[calc(100%-3.5rem)] rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/85">
          {caption}
        </div>
      </div>

      {slides.length > 1 && (
        <ul className="flex gap-1.5 overflow-x-auto pb-0.5">
          {slides.map((s, i) => (
            <li key={s.key} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={t('uaAuctions.photo.open', { n: i + 1, total: slides.length })}
                aria-current={i === current}
                className={cn(
                  'block h-12 w-16 overflow-hidden rounded-md border-2 transition-opacity',
                  i === current ? 'border-[var(--color-primary)]' : 'border-transparent opacity-70 hover:opacity-100'
                )}
              >
                <img
                  src={s.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => fail(s.key)}
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {zoomed && (
        <PhotoZoomDialog
          url={slide.src}
          candidates={[]}
          active={null}
          onClose={() => setZoomed(false)}
          onPrev={slides.length > 1 ? () => go(-1) : undefined}
          onNext={slides.length > 1 ? () => go(1) : undefined}
          position={{ n: current + 1, total: slides.length }}
        />
      )}
    </div>
  )
}
