import { Suspense, lazy, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import BackgroundDevPanel from '@/components/BackgroundDevPanel'
import BackgroundPhotos from '@/components/BackgroundPhotos'
import { useHeaderVehicleLabel } from '@/components/use-header-vehicle-label'
import { cn } from '@/lib/cn'
import { useUiStore } from '@/store/ui-store'

const Sidebar = lazy(() => import('@/components/Sidebar'))

type Props = {
  children: ReactNode
}

export default function Layout({ children }: Props): ReactNode {
  const { t } = useTranslation()
  const drawerOpen = useUiStore(s => s.drawerOpen)
  const setDrawerOpen = useUiStore(s => s.setDrawerOpen)
  const vehicleLabel = useHeaderVehicleLabel()
  // Sidebar is lazy-loaded (not part of the LCP path) — stay unmounted until
  // the first open, then keep mounted so close gets a transition instead of a hard unmount.
  const [hasOpened, setHasOpened] = useState(false)

  useEffect(() => {
    if (drawerOpen) setHasOpened(true)
  }, [drawerOpen])

  return (
    <div className="flex min-h-full flex-col">
      <BackgroundPhotos />
      <BackgroundDevPanel />
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          aria-label="menu"
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="rounded-md px-2 py-1 text-xl leading-none hover:bg-[var(--color-surface)]"
        >
          ☰
        </button>
        <Link to="/" className="shrink-0 text-lg font-semibold">
          {t('app.title')}
        </Link>
        {vehicleLabel && (
          <span className="min-w-0 truncate text-sm text-[var(--color-muted)]">{vehicleLabel}</span>
        )}
      </header>

      <div className="flex flex-1">
        {hasOpened && (
          <>
            <div
              className={cn(
                'fixed inset-0 z-10 bg-black/30 transition-opacity duration-300 md:hidden',
                drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
              )}
              onClick={() => setDrawerOpen(false)}
              aria-hidden
            />
            <div
              className={cn(
                'fixed inset-y-0 left-0 z-20 w-64 overflow-hidden transition-transform duration-300 ease-in-out',
                'md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] md:w-0 md:translate-x-0 md:self-start md:overflow-y-auto md:transition-[width] md:duration-300 md:ease-in-out',
                drawerOpen ? 'translate-x-0 md:w-64' : '-translate-x-full'
              )}
            >
              <Suspense fallback={<div className="w-64 border-r border-[var(--color-border)]" />}>
                <Sidebar />
              </Suspense>
            </div>
          </>
        )}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
