import { Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useUiStore } from '@/store/ui-store'

const Sidebar = lazy(() => import('@/components/Sidebar'))

type Props = {
  children: ReactNode
}

export default function Layout({ children }: Props): ReactNode {
  const { t } = useTranslation()
  const drawerOpen = useUiStore(s => s.drawerOpen)
  const setDrawerOpen = useUiStore(s => s.setDrawerOpen)

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <button
          type="button"
          aria-label="menu"
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="rounded-md px-2 py-1 text-xl leading-none hover:bg-[var(--color-surface)]"
        >
          ☰
        </button>
        <Link to="/" className="text-lg font-semibold">
          {t('app.title')}
        </Link>
      </header>

      <div className="flex flex-1">
        {drawerOpen && (
          <>
            <div
              className="fixed inset-0 z-10 bg-black/30 md:hidden"
              onClick={() => setDrawerOpen(false)}
              aria-hidden
            />
            <div className="fixed inset-y-0 left-0 z-20 md:static">
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
