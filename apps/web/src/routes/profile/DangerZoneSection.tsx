import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { SessionUser } from '@carplates/shared'

import DeleteAccountDialog from '@/components/auth/DeleteAccountDialog'
import { useAuthActions } from '@/components/auth/use-auth-actions'
import Card from '@/components/ui/Card'
import { isReauthRequired } from '@/lib/api'
import { authConfigQuery } from '@/lib/queries'
import { useRunSudo } from '@/routes/profile/reauth-context'

type Props = { user: SessionUser }

const DEFAULT_GRACE_DAYS = 14

/** Account deletion lives here (not in the dropdown): sudo-protected, with a grace period to change your mind. */
export default function DangerZoneSection({ user }: Props): ReactNode {
  const { t } = useTranslation()
  const runSudo = useRunSudo()
  const { deleteAccount } = useAuthActions()
  const graceDays = useQuery(authConfigQuery()).data?.deletionGraceDays ?? DEFAULT_GRACE_DAYS
  const [confirming, setConfirming] = useState(false)

  const handleConfirm = (): void => {
    runSudo(deleteAccount, undefined)
    setConfirming(false)
  }

  return (
    <Card className="mb-4 border-red-600/40">
      <h2 className="text-lg font-semibold text-red-600">{t('profile.danger.title')}</h2>
      <p className="mb-3 text-sm text-[var(--color-muted)]">{t('profile.danger.body', { days: graceDays })}</p>
      <button
        type="button"
        disabled={deleteAccount.isPending}
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-600/10 disabled:opacity-50"
      >
        {t('auth.deleteAccount')}
      </button>
      {deleteAccount.isError && !deleteAccount.isPending && !isReauthRequired(deleteAccount.error) && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {t('account.delete.error')}
        </p>
      )}

      {confirming && (
        <DeleteAccountDialog
          email={user.email ?? user.name ?? ''}
          pending={false}
          failed={false}
          graceDays={graceDays}
          onConfirm={handleConfirm}
          onClose={() => setConfirming(false)}
        />
      )}
    </Card>
  )
}
