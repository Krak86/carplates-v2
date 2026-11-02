import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCopyFeedback } from '@/components/use-copy-feedback'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { deleteShare } from '@/lib/api'
import { myPhotoSharesQuery } from '@/lib/queries'
import { daysLeft, forgetShareToken, pruneShareTokens, savedShareToken, shareUrl } from '@/lib/share-links'

function CopyLinkButton({ link }: { link: string }): ReactNode {
  const { t } = useTranslation()
  const { copied, copy } = useCopyFeedback()
  return (
    <button
      type="button"
      onClick={() => copy(link)}
      className="shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-bg)]"
    >
      {copied ? t('copy.copied') : t('photoShare.mine.copy')}
    </button>
  )
}

/**
 * Photo links the user shared. The API keeps only a hash of each token, so "Copy link" exists for the shares created on
 * this device (see `lib/share-links.ts`); every share can be deleted, which removes the photo at once.
 */
export default function SharesSection(): ReactNode {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const shares = useQuery(myPhotoSharesQuery())
  const list = shares.data?.shares ?? []

  const remove = useMutation({
    mutationFn: deleteShare,
    onSuccess: (_data, id) => {
      forgetShareToken(id)
      void queryClient.invalidateQueries({ queryKey: myPhotoSharesQuery().queryKey })
    }
  })

  useEffect(() => {
    if (shares.data) pruneShareTokens(shares.data.shares)
  }, [shares.data])

  return (
    <Card id="shares" className="mb-4 scroll-mt-20">
      <h2 className="text-lg font-semibold">{t('photoShare.mine.title')}</h2>
      <p className="text-sm text-[var(--color-muted)]">{t('photoShare.mine.hint', { max: shares.data?.max ?? 3 })}</p>

      {shares.isPending && <Spinner />}
      {shares.isError && <p className="text-sm text-red-600">{t('auth.error')}</p>}
      {shares.isSuccess && list.length === 0 && (
        <p className="py-3 text-sm text-[var(--color-muted)]">{t('photoShare.mine.empty')}</p>
      )}

      <ul className="divide-y divide-[var(--color-border)]">
        {list.map(share => {
          const token = savedShareToken(share.id)
          return (
            <li key={share.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 text-sm">
                <div className="truncate font-medium">{share.plate}</div>
                <div className="text-xs text-[var(--color-muted)]">
                  {t('photoShare.mine.expires', { count: daysLeft(share.expiresAt) })}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {token && <CopyLinkButton link={shareUrl(share.plate, token)} />}
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(share.id)}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-red-600 hover:bg-[var(--color-bg)] disabled:opacity-50"
                >
                  {t('photoShare.mine.delete')}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {remove.isError && <p className="text-sm text-red-600">{t('auth.error')}</p>}
    </Card>
  )
}
