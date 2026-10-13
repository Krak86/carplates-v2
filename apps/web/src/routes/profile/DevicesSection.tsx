import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'

import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { sessionsListQuery } from '@/lib/queries'
import { useProfileActions } from '@/routes/profile/use-profile-actions'
import { useUiStore } from '@/store/ui-store'

const LOCALES: Record<string, string> = { ua: 'uk-UA', ru: 'ru-RU', en: 'en-GB' }

/** Active sessions: revoke one, or sign out everywhere else. Scoped server-side to the caller's own sessions. */
export default function DevicesSection(): ReactNode {
  const { t } = useTranslation()
  const lang = useUiStore(s => s.lang)
  const sessions = useQuery(sessionsListQuery())
  const { revoke, revokeOthers } = useProfileActions()
  const list = sessions.data?.sessions ?? []
  const hasOthers = list.some(s => !s.current)

  return (
    <Card id="devices" className="mb-4 scroll-mt-20">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('profile.devices.title')}</h2>
        {hasOthers && (
          <button
            type="button"
            disabled={revokeOthers.isPending}
            onClick={() => revokeOthers.mutate()}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-bg)] disabled:opacity-50"
          >
            {t('profile.devices.revokeOthers')}
          </button>
        )}
      </div>

      {sessions.isPending && <Spinner />}
      {sessions.isError && <p className="text-sm text-red-600">{t('auth.error')}</p>}

      <ul className="divide-y divide-[var(--color-border)]">
        {list.map(session => (
          <li key={session.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 text-sm">
              <div className="truncate font-medium">
                {session.device}
                {session.current && (
                  <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-[var(--color-primary)]">
                    {t('profile.devices.current')}
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-[var(--color-muted)]">
                {t('profile.devices.lastSeen', {
                  when: new Date(session.lastSeenAt).toLocaleString(LOCALES[lang] ?? 'en-GB', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })
                })}
                {session.method
                  ? ` · ${t(`profile.devices.via.${session.method}`, { defaultValue: session.method })}`
                  : ''}
              </div>
            </div>

            {!session.current && (
              <button
                type="button"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(session.id)}
                className="shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-bg)] disabled:opacity-50"
              >
                {t('profile.devices.revoke')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
