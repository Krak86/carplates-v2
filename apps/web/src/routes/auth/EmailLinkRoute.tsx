import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { useAuthActions } from '@/components/auth/use-auth-actions'
import Card from '@/components/ui/Card'
import { safeNextPath } from '@/lib/safe-next-path'

/** Reads `#t=<token>[&next=/path]` once, then removes it from the address bar so it is never shared or re-sent. */
function readLinkFragment(): { token: string | null; next: string } {
  const params = new URLSearchParams(window.location.hash.slice(1))
  return { token: params.get('t'), next: safeNextPath(params.get('next')) }
}

/**
 * Magic-link landing page (`/auth/email#t=…`). The token only lives in the fragment (never in server logs or Referer) and
 * is POSTed after an explicit click — mail scanners that open links must not consume the single-use token.
 */
export default function EmailLinkRoute(): ReactNode {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { emailVerifyLink } = useAuthActions()
  const [link] = useState(readLinkFragment)

  // Drop the token from the address bar / history once it is in memory.
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  const handleContinue = (): void => {
    if (!link.token) return
    emailVerifyLink.mutate({ token: link.token }, { onSuccess: () => navigate(link.next, { replace: true }) })
  }

  return (
    <Card className="mx-auto mt-8 max-w-sm p-6 text-center">
      <h1 className="mb-2 text-xl font-bold">{t('auth.email.link.title')}</h1>

      {link.token ? (
        <>
          <p className="mb-4 text-sm text-[var(--color-muted)]">{t('auth.email.link.body')}</p>
          <button
            type="button"
            onClick={handleContinue}
            disabled={emailVerifyLink.isPending}
            className="w-full rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
          >
            {t('auth.email.link.button')}
          </button>
        </>
      ) : (
        <p className="text-sm text-red-600">{t('auth.email.link.missing')}</p>
      )}

      {emailVerifyLink.isError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {t('auth.email.link.error')}
        </p>
      )}
    </Card>
  )
}
