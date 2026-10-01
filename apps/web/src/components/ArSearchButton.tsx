import { lazy, Suspense, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

// Loaded on first open, so the dialog code (and, from it, the detector worker, ONNX runtime and model) stays out of the main bundle.
const ArCameraDialog = lazy(() => import('@/components/ArCameraDialog'))

type Props = {
  disabled?: boolean
}

export default function ArSearchButton({ disabled = false }: Props): ReactNode {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  if (!navigator.mediaDevices?.getUserMedia) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? t('offline.needsConnection') : undefined}
        className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-surface px-4 py-2 text-sm text-fg hover:border-muted hover:shadow-sm disabled:opacity-50"
      >
        <span aria-hidden>🔍</span>
        {t('search.byAr')}
      </button>
      <Suspense fallback={null}>{open && <ArCameraDialog onClose={() => setOpen(false)} />}</Suspense>
    </>
  )
}
