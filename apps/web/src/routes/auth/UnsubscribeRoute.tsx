import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'

import Card from '@/components/ui/Card'
import { unsubscribeDigest } from '@/lib/api'

/** Reads `#t=<token>` once; the fragment keeps the token out of server logs and Referer. */
function readToken(): string | null {
  return new URLSearchParams(window.location.hash.slice(1)).get('t')
}

/**
 * Landing page of the digest mail's "Unsubscribe" link. The POST happens on an explicit click, so a mail scanner that
 * opens the link cannot unsubscribe anyone; the one-click header covers mailbox-provider buttons separately.
 */
export default function UnsubscribeRoute(): ReactNode {
  const { t } = useTranslation()
  const [token] = useState(readToken)
  const unsubscribe = useMutation({ mutationFn: unsubscribeDigest })

  return (
    <Card className="mx-auto mt-8 max-w-sm p-6 text-center">
      <h1 className="mb-2 text-xl font-bold">{t('digest.unsubscribe.title')}</h1>

      {unsubscribe.isSuccess ? (
        <p role="status" className="text-sm text-[var(--color-muted)]">
          {t('digest.unsubscribe.done')}
        </p>
      ) : token ? (
        <>
          <p className="mb-4 text-sm text-[var(--color-muted)]">{t('digest.unsubscribe.body')}</p>
          <button
            type="button"
            onClick={() => unsubscribe.mutate(token)}
            disabled={unsubscribe.isPending}
            className="w-full rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
          >
            {t('digest.unsubscribe.button')}
          </button>
        </>
      ) : (
        <p className="text-sm text-red-600">{t('digest.unsubscribe.missing')}</p>
      )}

      {unsubscribe.isError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {t('digest.unsubscribe.error')}
        </p>
      )}
    </Card>
  )
}
