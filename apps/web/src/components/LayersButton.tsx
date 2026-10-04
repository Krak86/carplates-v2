import { Suspense, lazy, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useLocation } from 'react-router'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { isResultPath } from '@/lib/live-background'

const loadPanel = () => import('@/components/LayersPanel')
const LayersPanel = lazy(loadPanel)

/** Static, always-in-bundle trigger; the panel (and, once a live layer is picked, the iframes) load on demand. Hidden offline. */
export default function LayersButton(): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hovered || pinned

  const { pathname } = useLocation()

  if (!online || !isResultPath(pathname)) return null

  return (
    <div
      className="relative ml-auto shrink-0"
      onPointerEnter={e => {
        if (e.pointerType !== 'mouse') return
        void loadPanel()
        setHovered(true)
      }}
      onPointerLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={t('layers.button')}
        aria-expanded={open}
        title={t('layers.button')}
        onClick={() => {
          void loadPanel()
          setPinned(p => !p)
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
