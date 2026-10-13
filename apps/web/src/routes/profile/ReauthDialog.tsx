import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { EMAIL_CODE_LENGTH } from '@carplates/shared'
import type { EmailStartResponse } from '@carplates/shared'

import GoogleSignInButton from '@/components/auth/GoogleSignInButton'
import TelegramSignInButton from '@/components/auth/TelegramSignInButton'
import { signInMethodsQuery } from '@/lib/queries'
import { useProfileActions } from '@/routes/profile/use-profile-actions'
import { useUiStore } from '@/store/ui-store'

type Props = {
  onDone: () => void
  onCancel: () => void
}

const INPUT_CLASS =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-center font-mono text-lg tracking-[0.4em] outline-none focus:border-[var(--color-primary)]'
const BUTTON_CLASS =
  'w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-bg)] disabled:opacity-50'

/** "Confirm it is you": a fresh sign-in with one of the account's own methods unlocks sensitive actions for 10 minutes. */
export default function ReauthDialog({ onDone, onCancel }: Props): ReactNode {
  const { t } = useTranslation()
  const lang = useUiStore(s => s.lang)
  const methods = useQuery(signInMethodsQuery()).data
  const actions = useProfileActions()
  const [challenge, setChallenge] = useState<EmailStartResponse | null>(null)
  const [code, setCode] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return (): void => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const failed =
    actions.reauthEmailStart.isError ||
    actions.reauthEmailVerify.isError ||
    actions.reauthGoogle.isError ||
    actions.reauthTelegram.isError

  const handleSendCode = (): void =>
    actions.reauthEmailStart.mutate({ lang }, { onSuccess: response => setChallenge(response) })

  const verify = (value: string): void => {
    if (challenge) {
      actions.reauthEmailVerify.mutate({ challengeId: challenge.challengeId, code: value }, { onSuccess: onDone })
    }
  }

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, EMAIL_CODE_LENGTH)
    setCode(digits)
    if (digits.length === EMAIL_CODE_LENGTH) verify(digits)
  }

  const handleCodeSubmit = (e: FormEvent): void => {
    e.preventDefault()
    verify(code)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal
        aria-labelledby="reauth-title"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl"
      >
        <h2 id="reauth-title" className="mb-1 text-lg font-semibold">
          {t('profile.reauth.title')}
        </h2>
        <p className="mb-4 text-sm text-[var(--color-muted)]">{t('profile.reauth.body')}</p>

        <div className="space-y-3">
          {methods?.email &&
            (challenge ? (
              <form onSubmit={handleCodeSubmit}>
                <p className="mb-2 text-sm">{t('auth.email.sentCode', { email: methods.email })}</p>
                <input
                  value={code}
                  onChange={handleCodeChange}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={EMAIL_CODE_LENGTH}
                  placeholder="••••••"
                  aria-label={t('auth.email.codeLabel')}
                  autoFocus
                  className={INPUT_CLASS}
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={handleSendCode}
                disabled={actions.reauthEmailStart.isPending}
                className={BUTTON_CLASS}
              >
                {t('profile.reauth.email', { email: methods.email })}
              </button>
            ))}

          {methods?.google && (
            <GoogleSignInButton
              onCredential={credential => actions.reauthGoogle.mutate(credential, { onSuccess: onDone })}
            />
          )}

          {methods?.telegram && (
            <TelegramSignInButton
              onPayload={payload => actions.reauthTelegram.mutate(payload, { onSuccess: onDone })}
            />
          )}
        </div>

        {failed && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {t('profile.reauth.error')}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm hover:bg-[var(--color-bg)]">
            {t('profile.cancel')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
