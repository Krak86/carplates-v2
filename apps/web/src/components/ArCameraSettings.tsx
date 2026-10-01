import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CAMERA_QUALITIES, CAMERA_QUALITY_LABEL } from '@/components/camera-quality'
import type { CameraQuality } from '@/components/camera-quality'
import { cn } from '@/lib/cn'

type Props = {
  stream: MediaStream | null
  quality: CameraQuality
  onQualityChange: (quality: CameraQuality) => void
  devices: MediaDeviceInfo[]
  deviceId: string | null
  onDeviceChange: (deviceId: string) => void
}

type ToggleProps = {
  icon: ReactNode
  open: boolean
  label: string
  onToggle: () => void
}

const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  className: 'size-4'
} as const

// Sliders — video quality.
const QUALITY_ICON = (
  <svg {...ICON_PROPS}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </svg>
)

// Camera — lens / source.
const LENS_ICON = (
  <svg {...ICON_PROPS}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
)

function ChevronToggle({ icon, open, label, onToggle }: ToggleProps): ReactNode {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={open}
      className="flex h-8 items-center justify-center gap-1 rounded-full bg-black/50 px-2.5 text-white"
    >
      {icon}
      <span aria-hidden>{open ? '⌄' : '⌃'}</span>
    </button>
  )
}

/** Overlay on the video's bottom corners: quality on the left, camera source on the right; each folds behind a chevron. */
export default function ArCameraSettings({
  stream,
  quality,
  onQualityChange,
  devices,
  deviceId,
  onDeviceChange
}: Props): ReactNode {
  const { t } = useTranslation()
  const [qualityOpen, setQualityOpen] = useState(false)
  const [lensOpen, setLensOpen] = useState(false)
  const settings = stream?.getVideoTracks()[0]?.getSettings()
  const currentId = deviceId ?? settings?.deviceId ?? ''

  return (
    <>
      <div className="absolute bottom-2 left-2 flex flex-col items-start gap-1.5 text-xs text-white">
        {qualityOpen && (
          <div className="flex flex-col gap-1 rounded-lg bg-black/60 p-2">
            <div className="flex overflow-hidden rounded-full border border-white/40">
              {CAMERA_QUALITIES.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onQualityChange(q)}
                  className={cn('px-3 py-1', q === quality ? 'bg-white text-black' : 'hover:bg-white/20')}
                >
                  {CAMERA_QUALITY_LABEL[q]}
                </button>
              ))}
            </div>
            {settings?.width && settings.height && (
              <span className="text-center text-white/80 tabular-nums">
                {settings.width}×{settings.height}
              </span>
            )}
          </div>
        )}
        <ChevronToggle
          icon={QUALITY_ICON}
          open={qualityOpen}
          label={t('camera.quality')}
          onToggle={() => setQualityOpen(o => !o)}
        />
      </div>

      {devices.length > 1 && (
        <div className="absolute right-2 bottom-2 flex flex-col items-end gap-1.5 text-xs text-white">
          {lensOpen && (
            <select
              value={currentId}
              onChange={e => onDeviceChange(e.target.value)}
              aria-label={t('camera.lens')}
              className="max-w-44 rounded-lg bg-black/70 px-2 py-1.5 text-white"
            >
              {devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `${t('camera.lens')} ${i + 1}`}
                </option>
              ))}
            </select>
          )}
          <ChevronToggle
            icon={LENS_ICON}
            open={lensOpen}
            label={t('camera.lens')}
            onToggle={() => setLensOpen(o => !o)}
          />
        </div>
      )}
    </>
  )
}
