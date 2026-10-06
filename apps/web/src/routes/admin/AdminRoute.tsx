import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router'

import { useSession } from '@/components/auth/use-session'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { PAID_FEATURE_ICON } from '@/lib/paid-features'
import { adminUsersQuery } from '@/lib/queries'

const formatDate = (iso: string | null, locale: string): string =>
  iso ? new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : '—'

// Lazy-loaded (see App.tsx). The API enforces the role too (AdminGuard); this check is only for the UI.
export default function AdminRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const { isAdmin, isPending } = useSession()
  const users = useQuery({ ...adminUsersQuery(), enabled: isAdmin })

  if (isPending) return <Spinner />
  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="mx-auto w-full max-w-content">
      <h1 className="mb-4 text-2xl font-bold">{t('admin.title')}</h1>

      {users.isPending && <Spinner />}
      {users.isError && <p className="text-red-600">{t('result.error')}</p>}
      {users.isSuccess && users.data.users.length === 0 && (
        <p className="text-[var(--color-muted)]">{t('admin.empty')}</p>
      )}

      {users.isSuccess && users.data.users.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
              <tr>
                <th className="p-3 font-medium">{t('admin.user')}</th>
                <th className="p-3 font-medium">{t('admin.features')}</th>
                <th className="p-3 font-medium">{t('admin.updated')}</th>
                <th className="p-3 font-medium">{t('admin.lastLogin')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {users.data.users.map(u => (
                <tr key={u.id}>
                  <td className="p-3">
                    <div className="font-medium">{u.email}</div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {u.name ?? '—'} · {u.role}
                    </div>
                  </td>
                  <td className="p-3">
                    {u.features.length === 0
                      ? t('admin.none')
                      : u.features.map(f => (
                          <div key={f}>
                            <span aria-hidden>{PAID_FEATURE_ICON[f]}</span> {t(`paid.${f}.title`)}
                          </div>
                        ))}
                  </td>
                  <td className="p-3 whitespace-nowrap">{formatDate(u.featuresUpdatedAt, i18n.language)}</td>
                  <td className="p-3 whitespace-nowrap">{formatDate(u.lastLoginAt, i18n.language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
