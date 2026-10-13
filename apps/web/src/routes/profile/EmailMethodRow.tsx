import { useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EMAIL_CODE_LENGTH, EMAIL_IN_USE } from '@carplates/shared'

import { ApiError, isReauthRequired } from '@/lib/api'
import { useRunSudo } from '@/routes/profile/reauth-context'
import { useProfileActions } from '@/routes/profile/use-profile-actions'
import { useUiStore } from '@/store/ui-store'

type Props = { email: string | null }

const INPUT_CLASS =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]'
const BUTTON_CLASS =
  'rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50'

function errorKey(error: Error | null): string | null {
  // A stale session opens the re-authentication dialog instead; the retry follows, so no error is shown.
  if (!error || isReauthRequired(error)) return null
  if (error instanceof ApiError && error.status === 409 && error.message === EMAIL_IN_USE)
    return 'profile.methods.emailInUse'
  if (error instanceof ApiError && error.status === 401) return 'auth.email.error.invalid'
  if (error instanceof ApiError && error.status === 429) return 'auth.email.error.tooMany'
  return 'auth.email.error.generic'
}

/** Add (Telegram-only accounts) or change the account email: new address → 6-digit code → done. Needs a recent sign-in. */
export default function EmailMethodRow({ email }: Props): ReactNode {
  const { t } = useTranslation()
  const lang = useUiStore(s => s.lang)
  const runSudo = useRunSudo()
  const { setEmailStart, setEmailVerify } = useProfileActions()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [code, setCode] = useState('')
  // The code step is derived from the start mutation: once it has data, a challenge exists.
  const challenge = setEmailStart.data ?? null

  const close = (): void => {
    setEditing(false)
    setDraft('')
    setCode('')
    setEmailStart.reset()
    setEmailVerify.reset()
  }

  const handleSend = (e: FormEvent): void => {
    e.preventDefault()
    runSudo(setEmailStart, { email: draft, lang })
  }

  const verify = (value: string): void => {
    if (challenge) runSudo(setEmailVerify, { challengeId: challenge.challengeId, code: value })
  }

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, EMAIL_CODE_LENGTH)
    setCode(digits)
    if (digits.length === EMAIL_CODE_LENGTH) verify(digits)
  }

  const error = errorKey(challenge ? setEmailVerify.error : setEmailStart.error)

  if (setEmailVerify.isSuccess) {
    return (
      <li className="py-3">
        <p className="text-sm text-green-700">
          {t('profile.methods.emailChanged', { email: setEmailVerify.data.user?.email })}
        </p>
      </li>
    )
  }

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{t('profile.methods.email')}</div>
          <div className="truncate text-sm text-[var(--color-muted)]">{email ?? t('profile.methods.emailNone')}</div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-bg)]"
          >
            {email ? t('profile.methods.changeEmail') : t('profile.methods.addEmail')}
          </button>
        )}
      </div>

      {editing && !challenge && (
        <form onSubmit={handleSend} className="mt-3 flex gap-2">
          <input
            type="email"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            required
            autoComplete="email"
            placeholder={t('auth.email.placeholder')}
            aria-label={t('profile.methods.newEmail')}
            className={INPUT_CLASS}
          />
          <button type="submit" disabled={setEmailStart.isPending || !draft} className={BUTTON_CLASS}>
            {t('profile.methods.sendCode')}
          </button>
        </form>
      )}

      {editing && challenge && (
        <div className="mt-3">
          <p className="mb-2 text-sm">{t('auth.email.sentCode', { email: draft })}</p>
          <input
            value={code}
            onChange={handleCodeChange}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={EMAIL_CODE_LENGTH}
            placeholder="••••••"
            aria-label={t('auth.email.codeLabel')}
            autoFocus
            className={`${INPUT_CLASS} text-center font-mono text-lg tracking-[0.4em]`}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {t(error)}
        </p>
      )}

      {editing && (
        <button type="button" onClick={close} className="mt-2 text-xs text-[var(--color-muted)] underline">
          {t('profile.cancel')}
        </button>
      )}
    </li>
  )
}
