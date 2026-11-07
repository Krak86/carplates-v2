import { Suspense, lazy, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import ShareRemovedList from '@/components/ShareRemovedList'
import { useCopyFeedback } from '@/components/use-copy-feedback'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { deleteShare, ownShareImageUrl } from '@/lib/api'
import { myPhotoSharesQuery } from '@/lib/queries'
import {
  canNativeShare,
  daysLeft,
  forgetShareToken,
  nativeShareLink,
  pruneShareTokens,
  savedShareToken,
  shareUrl
} from '@/lib/share-links'

// Loaded on the first click on a thumbnail, not with the profile page.
const PhotoZoomDialog = lazy(() => import('@/components/PhotoZoomDialog'))

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
 * this device (see `lib/share-links.ts`); every share can be deleted, which removes the photo at once. Thumbnails come
 * from the owner route (by share id), so they show on every device.
 */
export default function SharesSection(): ReactNode {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const shares = useQuery(myPhotoSharesQuery())
  const list = shares.data?.shares ?? []
  const [zoomIndex, setZoomIndex] = useState<number | null>(null)
  const zoomed = zoomIndex === null ? undefined : list[zoomIndex]

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

  const step = (delta: number): void => setZoomIndex(i => (i === null ? i : (i + delta + list.length) % list.length))

  return (
    <Card id="shares" className="mb-4 scroll-mt-20">
      <h2 className="text-lg font-semibold">{t('photoShare.mine.title')}</h2>
      <p className="text-sm text-[var(--color-muted)]">{t('photoShare.mine.hint', { max: shares.data?.max ?? 3 })}</p>
      {shares.isSuccess && (
        <p className="text-sm font-medium">
          {t('photoShare.mine.count', { count: list.length, max: shares.data.max })}
        </p>
      )}

      {shares.isPending && <Spinner />}
      {shares.isError && <p className="text-sm text-red-600">{t('auth.error')}</p>}
      {shares.isSuccess && list.length === 0 && (
        <p className="py-3 text-sm text-[var(--color-muted)]">{t('photoShare.mine.empty')}</p>
      )}

      <ul className="divide-y divide-[var(--color-border)]">
        {list.map((share, index) => {
          const token = savedShareToken(share.id)
          return (
            <li key={share.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <button
                type="button"
                onClick={() => setZoomIndex(index)}
                aria-label={t('photoShare.mine.preview', { plate: share.plate })}
                className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-black/70"
              >
                <img src={ownShareImageUrl(share.id)} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
              <div className="min-w-0 flex-1 basis-32 text-sm">
                <div className="truncate font-medium">{share.plate}</div>
                <div className="text-xs text-[var(--color-muted)]">
                  {t('photoShare.mine.expires', { count: daysLeft(share.expiresAt) })}
                </div>
                <details className="mt-1 text-xs text-[var(--color-muted)]">
                  <summary className="cursor-pointer">{t('photoShare.mine.removed')}</summary>
                  <ShareRemovedList removed={share.removed} />
                </details>
              </div>
              <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
                {!token && <span className="text-xs text-[var(--color-muted)]">{t('photoShare.mine.noLink')}</span>}
                {token && <CopyLinkButton link={shareUrl(share.plate, token)} />}
                {token && canNativeShare() && (
                  <button
                    type="button"
                    onClick={() =>
                      void nativeShareLink(shareUrl(share.plate, token), t('photoShare.title')).catch(() => undefined)
                    }
                    className="shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-bg)]"
                  >
                    {t('photoShare.mine.share')}
                  </button>
                )}
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

      {zoomed && zoomIndex !== null && (
        <Suspense fallback={null}>
          <PhotoZoomDialog
            url={ownShareImageUrl(zoomed.id)}
            candidates={zoomed.candidates ?? []}
            active={null}
            onClose={() => setZoomIndex(null)}
            {...(list.length > 1 && { onPrev: () => step(-1), onNext: () => step(1) })}
            position={{ n: zoomIndex + 1, total: list.length }}
          />
        </Suspense>
      )}
    </Card>
  )
}
