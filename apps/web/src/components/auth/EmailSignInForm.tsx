import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'

import TurnstileSlot from '@/components/auth/TurnstileSlot'
import { useEmailSignIn } from '@/components/auth/use-email-sign-in'
import type { EmailErrorKind } from '@/components/auth/use-email-sign-in'
import { authConfigQuery } from '@/lib/queries'

const INPUT_CLASS =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]'
const BUTTON_CLASS =
  'w-full rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50'
const LINK_BUTTON_CLASS = 'text-xs text-[var(--color-muted)] underline disabled:no-underline disabled:opacity-60'

function ErrorLine({ kind }: { kind: EmailErrorKind | null }): ReactNode {
  const { t } = useTranslation()
  if (!kind) return null
  return (
    <p role="alert" className="mt-2 text-sm text-red-600">
      {t(`auth.email.error.${kind}`)}
    </p>
  )
}

/** Passwordless email sign-in for the login popover: address → 6-digit code (the mail also holds a magic link). */
export default function EmailSignInForm(): ReactNode {
  const { t } = useTranslation()
  const config = useQuery(authConfigQuery())
  const flow = useEmailSignIn()
  const siteKey = config.data?.turnstileSiteKey ?? null

  if (config.data?.emailEnabled === false) return null

  if (flow.challenge) {
    return (
      <form onSubmit={flow.handleCodeSubmit} className="mt-3 w-64">
        <p className="mb-2 text-sm">{t('auth.email.sent', { email: flow.email })}</p>
        <label className="sr-only" htmlFor="email-code">
          {t('auth.email.codeLabel')}
        </label>
        <input
          id="email-code"
          value={flow.code}
          onChange={flow.handleCodeChange}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="••••••"
          autoFocus
          className={`${INPUT_CLASS} text-center font-mono text-lg tracking-[0.4em]`}
        />

        <button type="submit" disabled={flow.verifying || flow.code.length < 6} className={`${BUTTON_CLASS} mt-2`}>
          {t('auth.email.verify')}
        </button>
        <ErrorLine kind={flow.verifyError} />

        <div className="mt-2 flex items-center justify-between gap-2">
          <button type="button" onClick={flow.handleChangeEmail} className={LINK_BUTTON_CLASS}>
            {t('auth.email.change')}
          </button>
          <button
            type="button"
            onClick={flow.send}
            disabled={flow.secondsLeft > 0 || flow.sending || (!!siteKey && !flow.hasTurnstileToken)}
            className={LINK_BUTTON_CLASS}
          >
            {flow.secondsLeft > 0 ? t('auth.email.resendIn', { seconds: flow.secondsLeft }) : t('auth.email.resend')}
          </button>
        </div>
        <ErrorLine kind={flow.sendError} />
        {siteKey && (
          <TurnstileSlot siteKey={siteKey} resetKey={flow.turnstileResetKey} onToken={flow.setTurnstileToken} />
        )}
      </form>
    )
  }

  return (
    <form onSubmit={flow.handleSendSubmit} className="mt-3 w-64">
      <div className="mb-3 flex items-center gap-2 text-xs text-[var(--color-muted)]">
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        {t('auth.email.or')}
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <label className="sr-only" htmlFor="email-address">
        {t('auth.email.label')}
      </label>
      <input
        id="email-address"
        type="email"
        value={flow.email}
        onChange={flow.handleEmailChange}
        autoComplete="email"
        required
        placeholder={t('auth.email.placeholder')}
        className={INPUT_CLASS}
      />

      {siteKey && (
        <TurnstileSlot siteKey={siteKey} resetKey={flow.turnstileResetKey} onToken={flow.setTurnstileToken} />
      )}

      <button
        type="submit"
        disabled={flow.sending || !flow.email || (!!siteKey && !flow.hasTurnstileToken)}
        className={`${BUTTON_CLASS} mt-2`}
      >
        {t('auth.email.send')}
      </button>
      <ErrorLine kind={flow.sendError} />
    </form>
  )
}
