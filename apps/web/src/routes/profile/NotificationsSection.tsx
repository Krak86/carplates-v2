import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { SessionUser } from '@carplates/shared'

import Card from '@/components/ui/Card'
import { sessionQuery } from '@/lib/queries'
import { useProfileActions } from '@/routes/profile/use-profile-actions'

type Props = { user: SessionUser }

/** Opt-in to the monthly "what's new" mail. Off until the user ticks it; needs a verified email on the account. */
export default function NotificationsSection({ user: cachedUser }: Props): ReactNode {
  const { t } = useTranslation()
  // The opt-in can change outside this page (unsubscribe link, other tab), so never trust the 5-minute session cache here.
  const session = useQuery({ ...sessionQuery(), staleTime: 0 })
  const user = session.data?.user ?? cachedUser
  const { setMarketing } = useProfileActions()
  const hasEmail = !!user.email

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setMarketing.mutate(event.target.checked)
  }

  return (
    <Card id="notifications" className="mb-4 scroll-mt-20">
      <h2 className="mb-3 text-lg font-semibold">{t('profile.notifications.title')}</h2>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={!!user.marketingOptIn}
          disabled={!hasEmail || setMarketing.isPending}
          onChange={handleChange}
          className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
        />
        <span>
          <span className="font-medium">{t('profile.notifications.digest')}</span>
          <span className="block text-xs text-[var(--color-muted)]">
            {hasEmail ? t('profile.notifications.digestHint') : t('profile.notifications.needEmail')}
          </span>
        </span>
      </label>

      {setMarketing.isError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {t('auth.error')}
        </p>
      )}
    </Card>
  )
}
