import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { CameraZoom } from '@/components/use-camera-zoom'

type Props = {
  camera: CameraZoom
  className?: string
}

// Hidden when the device/browser doesn't expose hardware zoom.
export default function CameraZoomControl({ camera, className }: Props): ReactNode {
  const { t } = useTranslation()
  const { range, zoom, setZoom } = camera

  if (!range) return null

  return (
    <div className={className}>
      <div className="flex items-center gap-3 rounded-full bg-black/50 px-4 py-2 text-white">
        <span className="w-10 text-sm tabular-nums">{zoom.toFixed(1)}×</span>
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          aria-label={t('camera.zoom')}
          className="w-full accent-white"
        />
      </div>
    </div>
  )
}
