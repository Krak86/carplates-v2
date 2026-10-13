import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { TelegramSignInRequest } from '@carplates/shared'

import { useAuthActions } from '@/components/auth/use-auth-actions'
import { authConfigQuery } from '@/lib/queries'
import { mountTelegramLogin } from '@/lib/telegram-login'
import { useUiStore } from '@/store/ui-store'

type Props = {
  /** Replaces the default sign-in (used to link Telegram or to re-authenticate). */
  onPayload?: (payload: TelegramSignInRequest) => void
}

/** Telegram's Login Widget (its own iframe button); the signed user object it returns is verified by the API. */
export default function TelegramSignInButton({ onPayload }: Props): ReactNode {
  const { t } = useTranslation()
  const lang = useUiStore(s => s.lang)
  const config = useQuery(authConfigQuery())
  const { signInTelegram } = useAuthActions()
  const slotRef = useRef<HTMLDivElement>(null)
  const botUsername = config.data?.telegramBotUsername ?? null
  const { mutate } = signInTelegram
  const handlerRef = useRef<(payload: TelegramSignInRequest) => void>(mutate)
  useEffect(() => {
    handlerRef.current = onPayload ?? mutate
  }, [onPayload, mutate])

  useEffect(() => {
    const slot = slotRef.current
    if (!botUsername || !slot) return
    return mountTelegramLogin(slot, botUsername, lang, payload => handlerRef.current(payload))
  }, [botUsername, lang])

  // Not configured → render nothing; the Google button already shows the "unavailable" hint when neither works.
  if (!botUsername) return null

  return (
    <div>
      <div ref={slotRef} className="mt-3 min-h-10" />
      {!onPayload && signInTelegram.isError && <p className="mt-2 text-sm text-red-600">{t('auth.error')}</p>}
    </div>
  )
}
