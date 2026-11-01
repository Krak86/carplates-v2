import { useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import PhotoZoomDialog from '@/components/PhotoZoomDialog'
import { PHOTO_FULL_WIDTH, PHOTO_THUMB_WIDTH } from '@/components/ua-auctions/helpers'
import { auctionPhotoUrl } from '@/lib/api'
import { cn } from '@/lib/cn'

const HERO_WIDTH = 960
const SWIPE_MIN_PX = 40

type Props = {
  /** Prozorro document ids (32 hex), one per photo file. */
  docIds: readonly string[]
  /** Names the photos for screen readers, e.g. the vehicle. */
  label: string
}

/**
 * Hero slot filled with photos of the car from its Prozorro.Sale lots: one large picture, arrows and a thumbnail strip to
 * switch. Always captioned as a lot photo (the car may have changed since). A photo that fails to load drops out of the list.
 */
export default function UaAuctionHero({ docIds, label }: Props): ReactNode {
  const { t } = useTranslation()
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set())
  const [index, setIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const swipe = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  const ids = docIds.filter(id => !failed.has(id))
  if (ids.length === 0) return null
  const current = Math.min(index, ids.length - 1)
  const docId = ids[current] as string
  const go = (step: number): void => setIndex((current + step + ids.length) % ids.length)
  // Horizontal swipe on touch: `touch-pan-y` leaves vertical page scroll alone; a swipe must not also open the zoom.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    swipe.current = { x: e.clientX, y: e.clientY, moved: false }
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>): void => {
    const start = swipe.current
    if (!start || ids.length < 2) return
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
          aria-label={t('uaAuctions.photo.open', { n: current + 1, total: ids.length })}
          className="block h-full w-full cursor-zoom-in"
        >
          <img
            key={docId}
            src={auctionPhotoUrl(docId, HERO_WIDTH)}
            alt={t('uaAuctions.photo.alt', { label, n: current + 1 })}
            fetchPriority="high"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(prev => new Set(prev).add(docId))}
            className="h-full w-full object-cover"
          />
        </button>

        {ids.length > 1 &&
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
          {t('uaAuctions.hero.caption', { n: current + 1, total: ids.length })}
        </div>
      </div>

      {ids.length > 1 && (
        <ul className="flex gap-1.5 overflow-x-auto pb-0.5">
          {ids.map((id, i) => (
            <li key={id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={t('uaAuctions.photo.open', { n: i + 1, total: ids.length })}
                aria-current={i === current}
                className={cn(
                  'block h-12 w-16 overflow-hidden rounded-md border-2 transition-opacity',
                  i === current ? 'border-[var(--color-primary)]' : 'border-transparent opacity-70 hover:opacity-100'
                )}
              >
                <img
                  src={auctionPhotoUrl(id, PHOTO_THUMB_WIDTH)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => setFailed(prev => new Set(prev).add(id))}
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {zoomed && (
        <PhotoZoomDialog
          url={auctionPhotoUrl(docId, PHOTO_FULL_WIDTH)}
          candidates={[]}
          active={null}
          onClose={() => setZoomed(false)}
        />
      )}
    </div>
  )
}
