import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import BackgroundDevPanel from '@/components/BackgroundDevPanel'
import BackgroundPhotos from '@/components/BackgroundPhotos'
import LoginButton from '@/components/auth/LoginButton'
import LayersButton from '@/components/LayersButton'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import OfflineBanner from '@/components/OfflineBanner'
import PwaUpdatePrompt from '@/components/PwaUpdatePrompt'
import QuickLinks from '@/components/QuickLinks'
import { useHeaderVehicleLabel } from '@/components/use-header-vehicle-label'
import { useBackgroundMode } from '@/hooks/useBackgroundMode'
import { cn } from '@/lib/cn'
import { setTransitionDirection } from '@/lib/view-transition'
import { useUiStore } from '@/store/ui-store'

const loadSidebar = () => import('@/components/Sidebar')
const Sidebar = lazy(loadSidebar)
const LiveBackground = lazy(() => import('@/components/LiveBackground'))

type Props = {
  children: ReactNode
}

export default function Layout({ children }: Props): ReactNode {
  const { t } = useTranslation()
  const drawerOpen = useUiStore(s => s.drawerOpen)
  const setDrawerOpen = useUiStore(s => s.setDrawerOpen)
  const vehicleLabel = useHeaderVehicleLabel()
  const backgroundMode = useBackgroundMode()
  const { pathname } = useLocation()
  // Sidebar is lazy-loaded (not part of the LCP path) — stay unmounted until
  // the first open, then keep mounted so close gets a transition instead of a hard unmount.
  const [hasOpened, setHasOpened] = useState(false)
  // First open: the panel mounts closed, then flips open two frames later so the slide actually transitions.
  const [entered, setEntered] = useState(false)
  const open = drawerOpen && entered

  const prevPathname = useRef(pathname)

  useLayoutEffect(() => {
    setTransitionDirection(prevPathname.current, pathname)
    prevPathname.current = pathname
  }, [pathname])

  // Following a plate/VIN link otherwise keeps the old scroll offset — land on the new result's top.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => {
    if (drawerOpen) setHasOpened(true)
  }, [drawerOpen])

  useEffect(() => {
    if (!hasOpened) return
    let id2 = 0
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setEntered(true))
    })
    return () => {
      cancelAnimationFrame(id1)
      cancelAnimationFrame(id2)
    }
  }, [hasOpened])

  // Warm the lazy chunk shortly after load so the first open doesn't wait on the network.
  useEffect(() => {
    const t = setTimeout(() => void loadSidebar(), 1500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex min-h-full flex-col">
      <BackgroundPhotos />
      {backgroundMode !== 'images' && (
        <Suspense fallback={null}>
          <LiveBackground />
        </Suspense>
      )}
      <BackgroundDevPanel />
      <header className="header-vt sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          aria-label="menu"
          onClick={() => setDrawerOpen(!drawerOpen)}
          onPointerEnter={() => void loadSidebar()}
          onFocus={() => void loadSidebar()}
          className="rounded-md px-2 py-1 text-xl leading-none hover:bg-[var(--color-surface)]"
        >
          ☰
        </button>
        <Link viewTransition to="/" className="shrink-0 text-lg font-semibold">
          {t('app.title')}
        </Link>
        {vehicleLabel && <span className="min-w-0 truncate text-sm text-[var(--color-muted)]">{vehicleLabel}</span>}
        <LayersButton />
        <LoginButton />
      </header>

      <OfflineBanner />

      <div className="flex flex-1">
        {hasOpened && (
          <>
            <div
              className={cn(
                'fixed inset-0 z-10 bg-black/30 transition-opacity duration-300',
                open ? 'opacity-100' : 'pointer-events-none opacity-0'
              )}
              onClick={() => setDrawerOpen(false)}
              aria-hidden
            />
            <div
              className={cn(
                'fixed inset-y-0 top-14 left-0 z-20 w-64 overflow-x-hidden overflow-y-auto transition-transform duration-300 ease-in-out',
                open ? 'translate-x-0' : '-translate-x-full'
              )}
            >
              <LoadErrorBoundary compact>
                <div className="w-64">
                  <Suspense fallback={<div className="w-64 border-r border-[var(--color-border)]" />}>
                    <Sidebar />
                  </Suspense>
                </div>
              </LoadErrorBoundary>
            </div>
          </>
        )}
        {/* QuickLinks lives inside the sidebar's row: sticky is bounded by its container, so a footer
            outside it would push the sidebar up under the header at the bottom of the page. */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="page-vt min-w-0 flex-1 p-4 md:p-8">{children}</main>

          <QuickLinks />
        </div>
      </div>

      <PwaUpdatePrompt />
    </div>
  )
}
