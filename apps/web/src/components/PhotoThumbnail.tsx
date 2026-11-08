import { useEffect, useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { PlateCandidate } from '@carplates/shared'

import PhotoPlateBoxes from '@/components/PhotoPlateBoxes'
import PhotoZoomDialog from '@/components/PhotoZoomDialog'
import SharePhotoButton from '@/components/SharePhotoButton'
import Spinner from '@/components/ui/Spinner'

type Props = {
  url: string
  candidates: PlateCandidate[]
  active: string | null
  /** True while the recognition request is in flight; a skip button appears if it drags on. */
  pending?: boolean
  /** The picked file when this photo may be shared (plate photo, not a certificate); null hides the Share button. */
  shareFile?: File | null
  onClose: () => void
  /** Step through the car's images (attached photo, model photo, lot photos); arrows and zoom navigation show when set. */
  onPrev?: () => void
  onNext?: () => void
  position?: { n: number; total: number }
}

const SKIP_AFTER_MS = 8000
const SWIPE_MIN_PX = 40

export default function PhotoThumbnail({
  url,
  candidates,
  active,
  pending = false,
  shareFile = null,
  onClose,
  onPrev,
  onNext,
  position
}: Props): ReactNode {
  const { t } = useTranslation()
  const [zoomed, setZoomed] = useState(false)
  const [slow, setSlow] = useState(false)
  const swipe = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  // Horizontal swipe steps through the images; `touch-pan-y` leaves vertical page scroll alone, and a swipe must not open the zoom.
  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>): void => {
    swipe.current = { x: e.clientX, y: e.clientY, moved: false }
  }
  const handlePointerUp = (e: PointerEvent<HTMLButtonElement>): void => {
    const start = swipe.current
    if (!start || !onPrev || !onNext) return
    const dx = e.clientX - start.x
    if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
      start.moved = true
      ;(dx < 0 ? onNext : onPrev)()
    }
  }

  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => setSlow(true), SKIP_AFTER_MS)
    return (): void => {
      clearTimeout(timer)
      setSlow(false)
    }
  }, [pending])

  return (
    <div className="relative w-full max-w-content">
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={() => {
          if (!swipe.current?.moved) setZoomed(true)
        }}
        aria-label={t('photo.zoomOpen')}
        className="flex h-64 w-full cursor-zoom-in touch-pan-y items-center justify-center rounded-lg bg-black/80 sm:h-80"
      >
        <span className="relative block max-w-full">
          <img
            src={url}
            alt=""
            draggable={false}
            referrerPolicy="no-referrer"
            className="block max-h-64 max-w-full rounded-lg sm:max-h-80"
          />
          <PhotoPlateBoxes candidates={candidates} active={active} />
        </span>
        <span aria-hidden className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
          🔍
        </span>
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('search.closePhoto')}
        className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
      >
        ✕
      </button>

      {([onPrev, onNext] as const).map((go, i) =>
        go ? (
          <button
            key={i}
            type="button"
            onClick={go}
            aria-label={t(i === 0 ? 'uaAuctions.hero.prev' : 'uaAuctions.hero.next')}
            className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-2.5 py-1 text-lg leading-none text-white hover:bg-black/75 ${i === 0 ? 'left-2' : 'right-2'}`}
          >
            {i === 0 ? '‹' : '›'}
          </button>
        ) : null
      )}

      {pending && slow && (
        <button
          type="button"
          onClick={onClose}
          className="absolute bottom-2 left-2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white hover:bg-black/90"
        >
          {t('photo.skip')}
        </button>
      )}

      {!pending && shareFile && <SharePhotoButton file={shareFile} />}

      {pending && (
        <p role="status" className="mt-2 flex items-center justify-center gap-2 text-center text-sm text-muted">
          <Spinner />
          {slow ? t('photo.slowHint') : t('photo.recognizing')}
        </p>
      )}

      {zoomed && (
        <PhotoZoomDialog
          url={url}
          candidates={candidates}
          active={active}
          onClose={() => setZoomed(false)}
          onPrev={onPrev}
          onNext={onNext}
          position={position}
        />
      )}
    </div>
  )
}
