import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import CameraCaptureDialog from '@/components/CameraCaptureDialog'

type Props = {
  isPending: boolean
  onCapture: (file: File) => void
}

export default function CameraSearchButton({ isPending, onCapture }: Props): ReactNode {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  if (!navigator.mediaDevices?.getUserMedia) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[var(--color-muted)] hover:text-[var(--color-fg)] disabled:opacity-50"
      >
        <span aria-hidden>🎥</span>
        {t('search.byCamera')}
      </button>
      <CameraCaptureDialog
        open={open}
        onClose={() => setOpen(false)}
        onCapture={file => {
          setOpen(false)
          onCapture(file)
        }}
      />
    </>
  )
}
