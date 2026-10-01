import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ArPlateInfo from './ArPlateInfo'
import { useArPlateReader } from './use-ar-plate-reader'
import { useLivePlateDetection } from './use-live-plate-detection'

type Props = {
  onClose: () => void
}

export default function ArCameraDialog({ onClose }: Props): ReactNode {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const reader = useArPlateReader()
  const detection = useLivePlateDetection(!error, videoRef, canvasRef, reader.handlers)

  useEffect(() => {
    let cancelled = false
    setError(null)

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      .then(stream => {
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const name = err instanceof DOMException ? err.name : ''
        if (name === 'NotAllowedError') setError('camera.blocked')
        else if (name === 'NotFoundError' || name === 'OverconstrainedError') setError('camera.noDevice')
        else setError('camera.error')
      })

    return (): void => {
      cancelled = true
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 sm:p-4" role="dialog" aria-modal>
      {/* Full screen on phones (portrait leaves lots of room under the video for info); a card on larger screens. */}
      <div className="flex h-full w-full flex-col overflow-y-auto bg-surface p-4 sm:h-auto sm:max-h-full sm:max-w-lg sm:rounded-xl">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-semibold">{t('ar.title')}</span>
          <button type="button" onClick={onClose} aria-label={t('camera.close')} className="text-muted hover:text-fg">
            ✕
          </button>
        </div>

        {error ? (
          <p className="py-8 text-center text-sm text-muted">{t(error)}</p>
        ) : (
          <div className="relative">
            <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-lg bg-black" />
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />

            {detection !== 'ready' && (
              <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                {t(detection === 'error' ? 'ar.detectorError' : 'ar.detectorLoading')}
              </span>
            )}
          </div>
        )}

        {!error && <ArPlateInfo reader={reader} onNavigate={onClose} />}
      </div>
    </div>
  )
}
