import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { SessionUser } from '@carplates/shared'

import Card from '@/components/ui/Card'
import { useUiStore } from '@/store/ui-store'

type Props = { user: SessionUser }

const LOCALES: Record<string, string> = { ua: 'uk-UA', ru: 'ru-RU', en: 'en-GB' }

export default function IdentitySection({ user }: Props): ReactNode {
  const { t } = useTranslation()
  const lang = useUiStore(s => s.lang)
  const since = new Date(user.createdAt).toLocaleDateString(LOCALES[lang] ?? 'en-GB', { dateStyle: 'long' })

  return (
    <Card className="mb-4">
      <h2 className="mb-3 text-lg font-semibold">{t('profile.identity.title')}</h2>

      <div className="flex items-center gap-3">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-[var(--color-primary)]"
          >
            {(user.name ?? user.email ?? '?').charAt(0).toUpperCase()}
          </span>
        )}

        <dl className="min-w-0 text-sm">
          <dt className="sr-only">{t('profile.identity.name')}</dt>
          <dd className="truncate font-medium">{user.name ?? user.email ?? t('auth.menu')}</dd>
          {/* The email is already the headline when the account has no name. */}
          {(user.name || !user.email) && (
            <>
              <dt className="sr-only">{t('profile.identity.email')}</dt>
              <dd className="truncate text-[var(--color-muted)]">{user.email ?? t('profile.identity.noEmail')}</dd>
            </>
          )}
          <dd className="text-xs text-[var(--color-muted)]">{t('profile.identity.since', { date: since })}</dd>
        </dl>
      </div>
    </Card>
  )
}
