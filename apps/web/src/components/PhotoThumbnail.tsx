import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { PlateCandidate } from '@carplates/shared'

import PhotoPlateBoxes from '@/components/PhotoPlateBoxes'
import PhotoZoomDialog from '@/components/PhotoZoomDialog'

type Props = {
  url: string
  candidates: PlateCandidate[]
  active: string | null
  onClose: () => void
}

export default function PhotoThumbnail({ url, candidates, active, onClose }: Props): ReactNode {
  const { t } = useTranslation()
  const [zoomed, setZoomed] = useState(false)

  return (
    <div className="relative w-full max-w-2xl">
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

      {zoomed && <PhotoZoomDialog url={url} candidates={candidates} active={active} onClose={() => setZoomed(false)} />}
    </div>
  )
}
