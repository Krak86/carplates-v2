import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { LinkableProvider } from '@carplates/shared'

import GoogleSignInButton from '@/components/auth/GoogleSignInButton'
import TelegramSignInButton from '@/components/auth/TelegramSignInButton'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { ApiError, isReauthRequired } from '@/lib/api'
import { signInMethodsQuery } from '@/lib/queries'
import EmailMethodRow from '@/routes/profile/EmailMethodRow'
import { useRunSudo } from '@/routes/profile/reauth-context'
import { useProfileActions } from '@/routes/profile/use-profile-actions'

type ProviderRowProps = {
  provider: LinkableProvider
  linked: boolean
  detail: string | null
}

function ProviderRow({ provider, linked, detail }: ProviderRowProps): ReactNode {
  const { t } = useTranslation()
  const runSudo = useRunSudo()
  const { link, unlink } = useProfileActions()
  const [confirming, setConfirming] = useState(false)

  const raw = unlink.error ?? link.error
  const error = isReauthRequired(raw) ? null : raw
  const errorText =
    error instanceof ApiError && error.status === 409 ? t('profile.methods.conflict') : error ? t('auth.error') : null

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{t(`profile.methods.${provider}`)}</div>
          <div className="truncate text-sm text-[var(--color-muted)]">
            {linked
              ? [t('profile.methods.linked'), detail].filter(Boolean).join(' · ')
              : t('profile.methods.notLinked')}
          </div>
        </div>

        {linked && !confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-bg)]"
          >
            {t('profile.methods.unlink')}
          </button>
        )}
      </div>

      {linked && confirming && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span>{t('profile.methods.unlinkConfirm')}</span>
          <button
            type="button"
            disabled={unlink.isPending}
            onClick={() => {
              runSudo(unlink, provider)
              setConfirming(false)
            }}
            className="rounded-lg bg-red-600 px-3 py-1 font-medium text-white disabled:opacity-50"
          >
            {t('profile.methods.unlink')}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-[var(--color-muted)] underline">
            {t('profile.cancel')}
          </button>
        </div>
      )}

      {!linked && provider === 'google' && (
        <div className="mt-2">
          <GoogleSignInButton onCredential={credential => runSudo(link, { provider, body: { credential } })} />
        </div>
      )}
      {!linked && provider === 'telegram' && (
        <TelegramSignInButton onPayload={payload => runSudo(link, { provider, body: payload })} />
      )}

      {errorText && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {errorText}
        </p>
      )}
    </li>
  )
}

export default function SignInMethodsSection(): ReactNode {
  const { t } = useTranslation()
  const methods = useQuery(signInMethodsQuery())

  return (
    <Card className="mb-4">
      <h2 className="text-lg font-semibold">{t('profile.methods.title')}</h2>
      <p className="mb-1 text-sm text-[var(--color-muted)]">{t('profile.methods.intro')}</p>

      {methods.isPending && <Spinner />}
      {methods.isError && <p className="text-sm text-red-600">{t('auth.error')}</p>}
      {methods.data && (
        <ul className="divide-y divide-[var(--color-border)]">
          <EmailMethodRow email={methods.data.email} />
          <ProviderRow provider="google" linked={!!methods.data.google} detail={methods.data.google?.email ?? null} />
          <ProviderRow provider="telegram" linked={!!methods.data.telegram} detail={null} />
        </ul>
      )}
    </Card>
  )
}
