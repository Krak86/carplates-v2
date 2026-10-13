import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { EMAIL_CODE_LENGTH } from '@carplates/shared'
import type { EmailStartResponse } from '@carplates/shared'

import { useAuthActions } from '@/components/auth/use-auth-actions'
import { ApiError } from '@/lib/api'
import { useUiStore } from '@/store/ui-store'

export type EmailErrorKind = 'invalid' | 'tooMany' | 'generic'

export function emailErrorKind(error: Error | null): EmailErrorKind | null {
  if (!error) return null
  if (error instanceof ApiError && error.status === 401) return 'invalid'
  if (error instanceof ApiError && error.status === 429) return 'tooMany'
  return 'generic'
}

/** Two-step email sign-in: address → 6-digit code (the same mail also carries a magic link). */
export function useEmailSignIn() {
  const { emailStart, emailVerify } = useAuthActions()
  const lang = useUiStore(s => s.lang)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState<EmailStartResponse | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  /** Bumped after every send so the (single-use) Turnstile token is replaced. */
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(0)

  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000))

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setNow(Date.now()), 1000)
    return (): void => clearTimeout(timer)
  }, [secondsLeft, now])

  const send = (): void => {
    emailStart.mutate(
      { email, lang, turnstileToken: turnstileToken ?? undefined },
      {
        onSuccess: response => {
          const started = Date.now()
          setChallenge(response)
          setCode('')
          setResendAt(started + response.resendAfterSeconds * 1000)
          setNow(started)
        },
        onSettled: () => {
          setTurnstileToken(null)
          setTurnstileResetKey(k => k + 1)
        }
      }
    )
  }

  const verify = (value: string): void => {
    if (challenge) emailVerify.mutate({ challengeId: challenge.challengeId, code: value })
  }

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => setEmail(e.target.value)

  const handleSendSubmit = (e: FormEvent): void => {
    e.preventDefault()
    send()
  }

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, EMAIL_CODE_LENGTH)
    setCode(digits)
    if (digits.length === EMAIL_CODE_LENGTH) verify(digits)
  }

  const handleCodeSubmit = (e: FormEvent): void => {
    e.preventDefault()
    if (code.length === EMAIL_CODE_LENGTH) verify(code)
  }

  const handleChangeEmail = (): void => {
    setChallenge(null)
    setCode('')
    emailVerify.reset()
  }

  return {
    email,
    code,
    challenge,
    secondsLeft,
    turnstileResetKey,
    hasTurnstileToken: turnstileToken !== null,
    setTurnstileToken,
    sending: emailStart.isPending,
    verifying: emailVerify.isPending,
    sendError: emailErrorKind(emailStart.error),
    verifyError: emailErrorKind(emailVerify.error),
    send,
    handleEmailChange,
    handleSendSubmit,
    handleCodeChange,
    handleCodeSubmit,
    handleChangeEmail
  }
}
