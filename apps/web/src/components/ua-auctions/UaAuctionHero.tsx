import { useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { prozorroDocumentUrl } from '@carplates/shared'

import PhotoZoomDialog from '@/components/PhotoZoomDialog'
import { cn } from '@/lib/cn'

const SWIPE_MIN_PX = 40

/** Stock photo of the car's make/model, shown as the last slide after the lot photos. */
type ModelPhoto = { url: string; credit: string | null }

type Slide = { key: string; src: string; isModel: boolean }

const MODEL_KEY = 'model'

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
  const swipe = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  const slides: Slide[] = [
    ...docIds.map(id => ({ key: id, src: prozorroDocumentUrl(id), isModel: false })),
    ...(modelPhoto ? [{ key: MODEL_KEY, src: modelPhoto.url, isModel: true }] : [])
  ].filter(slide => !failed.has(slide.key))
  if (slides.length === 0) return null
  const current = Math.min(index, slides.length - 1)
  const slide = slides[current] as Slide
  const lotCount = slides.filter(s => !s.isModel).length
  const go = (step: number): void => setIndex((current + step + slides.length) % slides.length)
  const fail = (key: string): void => setFailed(prev => new Set(prev).add(key))
  const caption = slide.isModel
    ? modelPhoto?.credit
      ? t('uaAuctions.hero.modelCaptionCredit', { credit: modelPhoto.credit })
      : t('uaAuctions.hero.modelCaption')
    : t('uaAuctions.hero.caption', { n: current + 1, total: lotCount })
  // Horizontal swipe on touch: `touch-pan-y` leaves vertical page scroll alone; a swipe must not also open the zoom.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    swipe.current = { x: e.clientX, y: e.clientY, moved: false }
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>): void => {
    const start = swipe.current
    if (!start || slides.length < 2) return
    const dx = e.clientX - start.x
    if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
      start.moved = true
      go(dx < 0 ? 1 : -1)
    }
  }

  return (
    <div className="hero-vt w-full max-w-content space-y-1.5">
      <div
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className="relative h-64 touch-pan-y overflow-hidden rounded-lg border border-border bg-surface/70 sm:h-80"
      >
        <button
          type="button"
          onClick={() => {
            if (!swipe.current?.moved) setZoomed(true)
          }}
          aria-label={t('uaAuctions.photo.open', { n: current + 1, total: slides.length })}
          className="block h-full w-full cursor-zoom-in"
        >
          <img
            key={slide.key}
            src={slide.src}
            alt={t('uaAuctions.photo.alt', { label, n: current + 1 })}
            fetchPriority="high"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => fail(slide.key)}
            className="h-full w-full object-cover"
          />
        </button>

        {slides.length > 1 &&
          ([-1, 1] as const).map(step => (
            <button
              key={step}
              type="button"
              onClick={() => go(step)}
              aria-label={t(step < 0 ? 'uaAuctions.hero.prev' : 'uaAuctions.hero.next')}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-2.5 py-1 text-lg leading-none text-white hover:bg-black/75',
                step < 0 ? 'left-2' : 'right-2'
              )}
            >
              {step < 0 ? '‹' : '›'}
            </button>
          ))}

        <div className="absolute bottom-2 left-2 max-w-[85%] rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/85">
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

      {zoomed && <PhotoZoomDialog url={slide.src} candidates={[]} active={null} onClose={() => setZoomed(false)} />}
    </div>
  )
}
