import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import CameraZoomControl from '@/components/CameraZoomControl'

type Props = {
  open: boolean
  onClose: () => void
  onCapture: (file: File) => void
}

export default function CameraCaptureDialog({ open, onClose, onCapture }: Props): ReactNode {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setError(null)

    navigator.mediaDevices
      .getUserMedia({
        // Ideal (not exact) — the browser picks the closest mode. A bigger stream gives digital zoom real pixels to crop.
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } }
      })
      .then(stream => {
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop())
          return
        }
        streamRef.current = stream
        setActiveStream(stream)
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
  }, [open])

  const grabVideoFrame = (): void => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      blob => {
        if (blob) onCapture(new File([blob], 'camera.jpg', { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.92
    )
  }

  // Prefer a full-resolution still (Chrome/Android, zoom applied) over a video frame; fall back to the frame.
  const handleCapture = (): void => {
    const track = activeStream?.getVideoTracks()[0]
    if (!track || !window.ImageCapture) {
      grabVideoFrame()
      return
    }
    new window.ImageCapture(track)
      .takePhoto()
      .then(blob => onCapture(new File([blob], 'camera.jpg', { type: blob.type || 'image/jpeg' })))
      .catch(grabVideoFrame)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 sm:p-4" role="dialog" aria-modal>
      {/* Phones: full-screen black viewfinder with a round shutter; larger screens: a card. */}
      <div className="relative flex h-dvh w-full flex-col bg-black text-white sm:h-auto sm:max-w-lg sm:overflow-hidden sm:rounded-xl">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-linear-to-b from-black/70 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:static sm:bg-none">
          <span className="font-semibold">{t('camera.title')}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('camera.close')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 hover:bg-black/60"
          >
            ✕
          </button>
        </div>

        {error ? (
          <p className="flex flex-1 items-center justify-center p-8 text-center text-sm text-white/80">{t(error)}</p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="min-h-0 w-full flex-1 object-cover sm:aspect-video sm:flex-none"
          />
        )}

        <CameraZoomControl
          stream={activeStream}
          className="absolute inset-x-4 bottom-28 z-10 sm:static sm:px-4 sm:pt-3"
        />

        <div className="absolute inset-x-0 bottom-0 flex justify-center bg-linear-to-t from-black/70 to-transparent p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:static sm:bg-none sm:pb-4">
          <button
            type="button"
            onClick={handleCapture}
            disabled={!!error}
            aria-label={t('camera.capture')}
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white p-1 disabled:opacity-40 sm:h-auto sm:w-full sm:rounded-lg sm:border-0 sm:bg-primary sm:px-4 sm:py-2 sm:font-medium sm:text-[var(--color-primary-fg)]"
          >
            <span className="h-full w-full rounded-full bg-white sm:hidden" aria-hidden />
            <span className="hidden sm:inline">{t('camera.capture')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
