import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router'

import { useAuthActions } from '@/components/auth/use-auth-actions'
import { useSession } from '@/components/auth/use-session'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'

// Lazy-loaded (see App.tsx). Asks first: a link that signed you out on open would be a state-changing GET.
export default function LogoutRoute(): ReactNode {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isPending } = useSession()
  const { signOut } = useAuthActions()

  if (isPending) return <Spinner />
  if (!user && !signOut.isSuccess) return <Navigate to="/" replace />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Card className="mx-auto w-fit max-w-full">
        <h1 className="mb-1 text-2xl font-bold">{t('auth.logout.title')}</h1>
        <p className="mb-4 max-w-xs text-sm text-[var(--color-muted)]">{t('auth.logout.confirm')}</p>
        {signOut.isError && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            {t('auth.logout.error')}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={signOut.isPending}
            onClick={() => signOut.mutate(undefined, { onSuccess: () => void navigate('/', { replace: true }) })}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
          >
            {t('auth.signOut')}
          </button>
          <Link
            to="/"
            replace
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm hover:bg-[var(--color-surface)]"
          >
            {t('auth.logout.cancel')}
          </Link>
        </div>
      </Card>
    </div>
  )
}
