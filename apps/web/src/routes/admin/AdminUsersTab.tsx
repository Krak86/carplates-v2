import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { PAID_FEATURE_ICON } from '@/lib/paid-features'
import { adminUsersQuery } from '@/lib/queries'

const formatDate = (iso: string | null, locale: string): string =>
  iso ? new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function AdminUsersTab(): ReactNode {
  const { t, i18n } = useTranslation()
  const users = useQuery(adminUsersQuery())

  return (
    <>
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
    </>
  )
}
