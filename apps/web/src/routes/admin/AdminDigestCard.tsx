import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery } from '@tanstack/react-query'

import Card from '@/components/ui/Card'
import { sendAdminDigestTest } from '@/lib/api'
import { adminDigestQuery } from '@/lib/queries'

/** Next monthly digest at a glance (period, recipients, content) plus a "send me a test" button. */
export default function AdminDigestCard(): ReactNode {
  const { t } = useTranslation()
  const digest = useQuery(adminDigestQuery())
  const test = useMutation({ mutationFn: sendAdminDigestTest })
  const data = digest.data

  return (
    <Card className="mb-4">
      <h2 className="mb-2 text-lg font-semibold">{t('admin.digest.title')}</h2>

      {digest.isError && <p className="text-sm text-red-600">{t('result.error')}</p>}
      {data && (
        <>
          <p className="text-sm">
            {t('admin.digest.summary', {
              period: data.period,
              features: data.features,
              optedIn: data.optedIn,
              sent: data.alreadySent
            })}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {data.enabled ? t('admin.digest.enabled') : t('admin.digest.disabled')}
            {!data.hasContent && ` ${t('admin.digest.empty')}`}
          </p>
        </>
      )}

      <button
        type="button"
        onClick={() => test.mutate()}
        disabled={test.isPending}
        className="mt-3 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-bg)] disabled:opacity-50"
      >
        {t('admin.digest.test')}
      </button>
      {test.isSuccess && (
        <p role="status" className="mt-2 text-xs text-[var(--color-muted)]">
          {test.data.sentTo ? t('admin.digest.sentTo', { email: test.data.sentTo }) : t('admin.digest.noEmail')}
        </p>
      )}
      {test.isError && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {t('result.error')}
        </p>
      )}
    </Card>
  )
}
