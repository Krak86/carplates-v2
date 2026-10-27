import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { PlateCandidate } from '@carplates/shared'

import PhotoPlateBoxes from '@/components/PhotoPlateBoxes'
import PhotoZoomDialog from '@/components/PhotoZoomDialog'

type Props = {
  url: string
  candidates: PlateCandidate[]
  active: string | null
  /** True while the recognition request is in flight; a skip button appears if it drags on. */
  pending?: boolean
  onClose: () => void
}

const SKIP_AFTER_MS = 8000

export default function PhotoThumbnail({ url, candidates, active, pending = false, onClose }: Props): ReactNode {
  const { t } = useTranslation()
  const [zoomed, setZoomed] = useState(false)
  const [slow, setSlow] = useState(false)

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
        onClick={() => setZoomed(true)}
        aria-label={t('photo.zoomOpen')}
        className="flex w-full cursor-zoom-in justify-center rounded-lg bg-black/80"
      >
        <span className="relative block max-w-full">
          <img src={url} alt="" className="block max-h-64 max-w-full rounded-lg sm:max-h-80" />
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

      {pending && slow && (
        <button
          type="button"
          onClick={onClose}
          className="absolute bottom-2 left-2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white hover:bg-black/90"
        >
          {t('photo.skip')}
        </button>
      )}

      {zoomed && <PhotoZoomDialog url={url} candidates={candidates} active={active} onClose={() => setZoomed(false)} />}
    </div>
  )
}
