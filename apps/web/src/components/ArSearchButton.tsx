import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { SEARCH_BUTTON_CLASS, SEARCH_BUTTON_ICON_CLASS } from '@/components/search-button-styles'

// Loaded on first open, so the dialog code (and, from it, the detector worker, ONNX runtime and model) stays out of the main bundle.
const ArCameraDialog = lazy(() => import('@/components/ArCameraDialog'))

type Props = {
  disabled?: boolean
}

export default function ArSearchButton({ disabled = false }: Props): ReactNode {
  const { t } = useTranslation()
  // The open state lives in the URL (`?section=ar`), so the scanner is a shareable link and survives a reload.
  const [searchParams, setSearchParams] = useSearchParams()
  const open = searchParams.get('section') === 'ar'

  const handleOpen = (): void => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev)
        next.set('section', 'ar')
        return next
      },
      { replace: true }
    )
  }

  const handleClose = (): void => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev)
        next.delete('section')
        return next
      },
      { replace: true }
    )
  }

  if (!navigator.mediaDevices?.getUserMedia) return null

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        title={disabled ? t('offline.needsConnection') : undefined}
        className={SEARCH_BUTTON_CLASS}
      >
        <span aria-hidden className={SEARCH_BUTTON_ICON_CLASS}>
          🔍
        </span>
        {t('search.byAr')}
      </button>
      <Suspense fallback={null}>{open && !disabled && <ArCameraDialog onClose={handleClose} />}</Suspense>
    </>
  )
}
