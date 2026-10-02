import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import ArCameraSettings from '@/components/ArCameraSettings'
import { DEFAULT_CAMERA_QUALITY, videoConstraints } from '@/components/camera-quality'
import type { CameraQuality } from '@/components/camera-quality'
import CameraZoomControl from '@/components/CameraZoomControl'
import { useCameraZoom } from '@/components/use-camera-zoom'
import { usePinchZoom } from '@/components/use-pinch-zoom'

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
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quality, setQuality] = useState<CameraQuality>(DEFAULT_CAMERA_QUALITY)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const videoBoxRef = useRef<HTMLDivElement>(null)
  const cameraZoom = useCameraZoom(activeStream)
  usePinchZoom(videoBoxRef, cameraZoom)
  const resultsRef = useRef<HTMLDivElement>(null)
  const [resultsVisible, setResultsVisible] = useState(false)
  const reader = useArPlateReader()
  const detection = useLivePlateDetection(!error, videoRef, canvasRef, reader.handlers)

  useEffect(() => {
    let cancelled = false
    setError(null)

    navigator.mediaDevices
      .getUserMedia({ video: videoConstraints(quality, deviceId) })
      .then(stream => {
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop())
          return
        }
        streamRef.current = stream
        setActiveStream(stream)
        if (videoRef.current) videoRef.current.srcObject = stream
        // Labels (and, on some browsers, the full list) only appear once camera permission is granted.
        void navigator.mediaDevices.enumerateDevices().then(all => {
          if (!cancelled) setDevices(all.filter(d => d.kind === 'videoinput'))
        })
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
  }, [quality, deviceId])

  // The "N plates found" pill on the video hides once the results are actually in view; we never auto-scroll.
  useEffect(() => {
    const el = resultsRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setResultsVisible(!!entry?.isIntersecting))
    observer.observe(el)
    return (): void => observer.disconnect()
  }, [error])

  const handleShowResults = (): void => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Portaled: view-transition-named ancestors (<main>, search field, card) are stacking contexts and
  // transformed ancestors are `fixed` containing blocks — inline, this sat under the header and stats panels.
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 sm:p-4" role="dialog" aria-modal>
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
          // The box shrink-wraps the video so the canvas overlay still lines up.
          // touch-pan-y: one finger still scrolls the dialog, two fingers pinch-zoom (see usePinchZoom).
          <div ref={videoBoxRef} className="relative mx-auto w-fit max-w-full touch-pan-y">
            <video ref={videoRef} autoPlay muted playsInline className="max-h-[70dvh] max-w-full rounded-lg bg-black" />
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />

            <CameraZoomControl camera={cameraZoom} className="absolute inset-x-3 top-3" />

            <ArCameraSettings
              stream={activeStream}
              quality={quality}
              onQualityChange={setQuality}
              devices={devices}
              deviceId={deviceId}
              onDeviceChange={setDeviceId}
            />

            {detection !== 'ready' ? (
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-xs whitespace-nowrap text-white">
                {t(detection === 'error' ? 'ar.detectorError' : 'ar.detectorLoading')}
              </span>
            ) : (
              !!reader.plates.length &&
              !resultsVisible && (
                <button
                  type="button"
                  onClick={handleShowResults}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium whitespace-nowrap text-primary-fg shadow"
                >
                  {t('ar.found', { count: reader.plates.length })} ↓
                </button>
              )
            )}
          </div>
        )}

        {!error && (
          <div ref={resultsRef}>
            <ArPlateInfo reader={reader} onNavigate={onClose} />
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
