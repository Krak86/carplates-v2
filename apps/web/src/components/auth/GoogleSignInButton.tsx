import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'

import { useAuthActions } from '@/components/auth/use-auth-actions'
import { loadGoogleIdentity } from '@/lib/google-identity'
import { authConfigQuery } from '@/lib/queries'
import { useUiStore } from '@/store/ui-store'

const GOOGLE_LOCALE: Record<string, string> = { ua: 'uk', ru: 'ru', en: 'en' }

type Props = {
  /** Replaces the default "swap the credential for a session" (used to link Google or to re-authenticate). */
  onCredential?: (credential: string) => void
}

/** Renders Google's own button (it must be, for Google's branding rules) and swaps its credential for a session. */
export default function GoogleSignInButton({ onCredential }: Props): ReactNode {
  const { t } = useTranslation()
  const lang = useUiStore(s => s.lang)
  const theme = useUiStore(s => s.theme)
  const config = useQuery(authConfigQuery())
  const { signIn } = useAuthActions()
  const slotRef = useRef<HTMLDivElement>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const clientId = config.data?.googleClientId ?? null
  const { mutate: signInMutate } = signIn
  // The button is initialised once per config change; the latest handler is read through a ref so a new closure
  // from the parent never re-renders Google's iframe.
  const handlerRef = useRef<(credential: string) => void>(signInMutate)
  useEffect(() => {
    handlerRef.current = onCredential ?? signInMutate
  }, [onCredential, signInMutate])

  useEffect(() => {
    const slot = slotRef.current
    if (!clientId || !slot) return
    let cancelled = false
    loadGoogleIdentity(GOOGLE_LOCALE[lang] ?? 'en').then(
      api => {
        if (cancelled) return
        api.initialize({
          client_id: clientId,
          callback: ({ credential }) => handlerRef.current(credential),
          use_fedcm_for_button: true
        })
        slot.replaceChildren()
        api.renderButton(slot, {
          type: 'standard',
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill'
        })
      },
      () => {
        if (!cancelled) setLoadFailed(true)
      }
    )
    return () => {
      cancelled = true
    }
  }, [clientId, lang, theme])

  if (config.isSuccess && !clientId) {
    return <p className="text-sm text-[var(--color-muted)]">{t('auth.unavailable')}</p>
  }

  return (
    <div>
      <div ref={slotRef} className="min-h-10" />
      {loadFailed && <p className="mt-2 text-sm text-red-600">{t('auth.loadError')}</p>}
      {!onCredential && signIn.isError && <p className="mt-2 text-sm text-red-600">{t('auth.error')}</p>}
    </div>
  )
}
