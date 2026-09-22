import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  open: boolean
  onClose: () => void
  onCapture: (file: File) => void
}

export default function CameraCaptureDialog({ open, onClose, onCapture }: Props): ReactNode {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

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
  }, [open])

  const handleCapture = (): void => {
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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-lg rounded-xl bg-[var(--color-surface)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-semibold">{t('camera.title')}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('camera.close')}
            className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            ✕
          </button>
        </div>

        {error ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">{t(error)}</p>
        ) : (
          <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-lg bg-black" />
        )}

        <button
          type="button"
          onClick={handleCapture}
          disabled={!!error}
          className="mt-3 w-full rounded-lg bg-[var(--color-primary)] px-4 py-2 font-medium text-[var(--color-primary-fg)] hover:opacity-90 disabled:opacity-50"
        >
          {t('camera.capture')}
        </button>
      </div>
    </div>
  )
}
