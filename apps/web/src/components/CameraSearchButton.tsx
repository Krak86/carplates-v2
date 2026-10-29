import { useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import CameraCaptureDialog from '@/components/CameraCaptureDialog'
import { SEARCH_BUTTON_CLASS, SEARCH_BUTTON_ICON_CLASS } from '@/components/search-button-styles'

type Props = {
  isPending: boolean
  disabled?: boolean
  onCapture: (file: File) => void
}

// Phones (touch-first): hand off to the device's own camera app — real lenses, optical zoom, full-resolution
// photo, which a web page's getUserMedia stream can't match. Desktop: the in-page live-camera dialog.
const isTouchDevice = (): boolean => window.matchMedia?.('(pointer: coarse)').matches ?? false

export default function CameraSearchButton({ isPending, disabled = false, onCapture }: Props): ReactNode {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const native = isTouchDevice()

  if (!native && !navigator.mediaDevices?.getUserMedia) return null

  const handleClick = (): void => {
    if (native) inputRef.current?.click()
    else setOpen(true)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onCapture(file)
  }

  return (
    <>
      {native && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          className="hidden"
        />
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || disabled}
        title={disabled ? t('offline.needsConnection') : undefined}
        className={SEARCH_BUTTON_CLASS}
      >
        <span aria-hidden className={SEARCH_BUTTON_ICON_CLASS}>
          🎥
        </span>
        {t('search.byCamera')}
      </button>
      {!native && (
        <CameraCaptureDialog
          open={open}
          onClose={() => setOpen(false)}
          onCapture={file => {
            setOpen(false)
            onCapture(file)
          }}
        />
      )}
    </>
  )
}
