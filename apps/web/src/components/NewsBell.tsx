import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import NewsBellSkeleton from '@/components/NewsBellSkeleton'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { readReleasesSeen, writeReleasesSeen } from '@/lib/releases-seen'
import { LATEST_RELEASE_DATE } from '@/routes/releases/latest'

const loadPanel = () => import('@/components/NewsBellPanel')
const NewsBellPanel = lazy(loadPanel)

/**
 * Header bell: a dot while the newest release day is newer than what this browser has seen, a dropdown with the
 * latest items, and a link to /releases. "Seen" is a localStorage date - public site, no account needed.
 * A first-time visitor starts as caught up (nothing to compare against), so the dot only appears for later releases.
 */
export default function NewsBell(): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState<string | null>(() => readReleasesSeen())
  const rootRef = useRef<HTMLDivElement>(null)
  // Frozen while the panel is open, so its per-item dots survive marking everything as seen.
  const [panelSeen, setPanelSeen] = useState<string | null>(null)

  // First visit: nothing to compare against, start caught up. Being on /releases also counts as seen.
  if ((!seen || pathname === '/releases') && seen !== LATEST_RELEASE_DATE) setSeen(LATEST_RELEASE_DATE)

  const unread = !!seen && seen < LATEST_RELEASE_DATE

  useEffect(() => {
    if (seen) writeReleasesSeen(seen)
  }, [seen])

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

  const handleToggle = (): void => {
    void loadPanel()
    if (!open) {
      setPanelSeen(seen)
      setSeen(LATEST_RELEASE_DATE)
    }
    setOpen(o => !o)
  }

  return (
    <div ref={rootRef} className="relative shrink-0 max-md:ml-auto">
      <button
        type="button"
        aria-label={t('nav.releases')}
        aria-expanded={open}
        title={t('nav.releases')}
        onClick={handleToggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] shadow hover:bg-[var(--color-surface)]"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {unread && (
          <span
            aria-hidden
            className="absolute top-1.5 right-1.5 size-2.5 rounded-full border border-[var(--color-bg)] bg-[var(--color-primary)]"
          />
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-40 pt-2">
          <Suspense fallback={<NewsBellSkeleton />}>
            <NewsBellPanel seen={panelSeen} onNavigate={() => setOpen(false)} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
