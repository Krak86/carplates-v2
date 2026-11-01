import { lazy } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router'

import { useSession } from '@/components/auth/use-session'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'

const GoogleSignInButton = lazy(() => import('@/components/auth/GoogleSignInButton'))
const TelegramSignInButton = lazy(() => import('@/components/auth/TelegramSignInButton'))
const EmailSignInForm = lazy(() => import('@/components/auth/EmailSignInForm'))

// Lazy-loaded (see App.tsx). The login popover's content on its own page; there is no separate sign-up, the first sign-in creates the account.
export default function LoginRoute(): ReactNode {
  const { t } = useTranslation()
  const { user, isPending } = useSession()

  if (isPending) return <Spinner />
  if (user) return <Navigate to="/" replace />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Card className="mx-auto w-fit max-w-full">
        <h1 className="mb-1 text-2xl font-bold">{t('auth.login.title')}</h1>
        <p className="mb-4 max-w-xs text-sm text-[var(--color-muted)]">{t('auth.login.intro')}</p>
        <GoogleSignInButton />
        <TelegramSignInButton />
        <EmailSignInForm />
      </Card>
    </div>
  )
}
