import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'

const loadPanel = () => import('@/components/LayersPanel')
const LayersPanel = lazy(loadPanel)

/** Static, always-in-bundle trigger; the panel (and, once a live layer is picked, the iframes) load on demand. Hidden offline. */
export default function LayersButton(): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Opened by click only; a press outside the button/panel (or Escape) closes it.
  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e: PointerEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return (): void => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!online) return null

  return (
    <div ref={rootRef} className="relative ml-auto shrink-0">
      <button
        type="button"
        aria-label={t('layers.button')}
        aria-expanded={open}
        title={t('layers.button')}
        onPointerEnter={() => void loadPanel()}
        onClick={() => {
          void loadPanel()
          setOpen(o => !o)
        }}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] shadow hover:bg-[var(--color-surface)]"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        >
          <path d="M12 3 3 8l9 5 9-5-9-5Z" />
          <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 pt-2">
          <Suspense fallback={null}>
            <LayersPanel />
          </Suspense>
        </div>
      )}
    </div>
  )
}
