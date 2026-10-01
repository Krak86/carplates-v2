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

export default function ArCameraSettings({
  stream,
  quality,
  onQualityChange,
  devices,
  deviceId,
  onDeviceChange
}: Props): ReactNode {
  const { t } = useTranslation()
  const settings = stream?.getVideoTracks()[0]?.getSettings()
  const currentId = deviceId ?? settings?.deviceId ?? ''

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted">{t('camera.quality')}</span>
      <div className="flex overflow-hidden rounded-full border border-border">
        {CAMERA_QUALITIES.map(q => (
          <button
            key={q}
            type="button"
            onClick={() => onQualityChange(q)}
            className={cn('px-3 py-1', q === quality ? 'bg-primary text-primary-fg' : 'text-fg hover:bg-bg')}
          >
            {CAMERA_QUALITY_LABEL[q]}
          </button>
        ))}
      </div>

      {devices.length > 1 && (
        <select
          value={currentId}
          onChange={e => onDeviceChange(e.target.value)}
          aria-label={t('camera.lens')}
          className="max-w-40 rounded-full border border-border bg-bg px-2 py-1"
        >
          {devices.map((d, i) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `${t('camera.lens')} ${i + 1}`}
            </option>
          ))}
        </select>
      )}

      {settings?.width && settings.height && (
        <span className="text-muted tabular-nums">
          {settings.width}×{settings.height}
        </span>
      )}
    </div>
  )
}
