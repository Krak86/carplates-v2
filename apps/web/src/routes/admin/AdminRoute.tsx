import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useSearchParams } from 'react-router'

import AccountNav from '@/components/auth/AccountNav'
import { useSession } from '@/components/auth/use-session'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import AdminLinksTab from '@/routes/admin/AdminLinksTab'
import AdminServerTab from '@/routes/admin/AdminServerTab'
import AdminStatsTab from '@/routes/admin/AdminStatsTab'
import AdminUsersTab from '@/routes/admin/AdminUsersTab'

const ADMIN_TABS = ['users', 'stats', 'server', 'links'] as const
type AdminTab = (typeof ADMIN_TABS)[number]
const DEFAULT_TAB: AdminTab = 'users'

const isTab = (value: string | null): value is AdminTab => ADMIN_TABS.some(tab => tab === value)

// Lazy-loaded (see App.tsx). The API enforces the role too (AdminGuard); this check is only for the UI.
export default function AdminRoute(): ReactNode {
  const { t } = useTranslation()
  const { isAdmin, isPending } = useSession()
  const [searchParams, setSearchParams] = useSearchParams()

  if (isPending) return <Spinner />
  if (!isAdmin) return <Navigate to="/" replace />

  const requested = searchParams.get('tab')
  const tab = isTab(requested) ? requested : DEFAULT_TAB

  return (
    <div className="mx-auto w-full max-w-content">
      <AccountNav />

      <h1 className="mb-3 text-2xl font-bold">{t('admin.title')}</h1>

      <div role="tablist" className="mb-4 flex gap-2">
        {ADMIN_TABS.map(id => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setSearchParams(id === DEFAULT_TAB ? {} : { tab: id }, { replace: true })}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              tab === id
                ? 'border-[var(--color-primary)] bg-primary/10 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] hover:bg-[var(--color-bg)]'
            )}
          >
            {t(`admin.tabs.${id}`)}
          </button>
        ))}
      </div>

      {/* Keyed by tab so the panel remounts and eases in (opacity + transform only, GPU-composited). */}
      <div key={tab} role="tabpanel" className="animate-row-in space-y-4">
        {tab === 'users' && <AdminUsersTab />}
        {tab === 'stats' && <AdminStatsTab />}
        {tab === 'server' && <AdminServerTab />}
        {tab === 'links' && <AdminLinksTab />}
      </div>
    </div>
  )
}
