import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router'

import AccountNav from '@/components/auth/AccountNav'
import { useSession } from '@/components/auth/use-session'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import DangerZoneSection from '@/routes/profile/DangerZoneSection'
import DevicesSection from '@/routes/profile/DevicesSection'
import IdentitySection from '@/routes/profile/IdentitySection'
import NotificationsSection from '@/routes/profile/NotificationsSection'
import ReauthGate from '@/routes/profile/ReauthGate'
import SignInMethodsSection from '@/routes/profile/SignInMethodsSection'

// Lazy-loaded (see App.tsx). Sign-in-only: security-sensitive actions here need a recent sign-in (re-auth dialog).
export default function ProfileRoute(): ReactNode {
  const { t } = useTranslation()
  const { user, isPending } = useSession()
  const { hash } = useLocation()

  useEffect(() => {
    if (user && hash === '#devices') document.getElementById('devices')?.scrollIntoView({ behavior: 'smooth' })
  }, [user, hash])

  if (isPending) return <Spinner />
  if (!user) return <Navigate to="/" replace />

  return (
    <div className="mx-auto w-full max-w-content">
      <AccountNav />

      <Card className="mb-4">
        <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
      </Card>

      <ReauthGate>
        <IdentitySection user={user} />
        <SignInMethodsSection />
        <NotificationsSection user={user} />
        <DevicesSection />
        <DangerZoneSection user={user} />
      </ReauthGate>
    </div>
  )
}
