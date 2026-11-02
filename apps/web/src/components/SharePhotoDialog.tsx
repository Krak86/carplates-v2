import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SHARE_MAX_ACTIVE, SHARE_TTL_DAYS } from '@carplates/shared'
import type { CreateShareResponse } from '@carplates/shared'

import { shareErrorKey } from '@/components/share-photo.helpers'
import { useCopyFeedback } from '@/components/use-copy-feedback'
import Spinner from '@/components/ui/Spinner'
import { createShare, deleteShare, shareImageUrl } from '@/lib/api'
import { shrinkImage } from '@/lib/image'
import { myPhotoSharesQuery } from '@/lib/queries'
import { saveShareToken, shareUrl } from '@/lib/share-links'

// Loaded on the first click on the preview.
const PhotoZoomDialog = lazy(() => import('@/components/PhotoZoomDialog'))

type Props = {
  /** The picked photo; null when it could not be restored after sign-in ("pick the photo again"). */
  file: File | null
  onClose: () => void
}

function MineLink({ onClick }: { onClick: () => void }): ReactNode {
  const { t } = useTranslation()
  return (
    <Link
      to="/profile#shares"
      onClick={onClick}
      className="inline-block font-medium text-[var(--color-primary)] underline underline-offset-2"
    >
      {t('photoShare.openMine')}
    </Link>
  )
}

/**
 * Two steps. The photo is uploaded as soon as the dialog opens: the server blurs the faces and the dialog previews that
 * blurred copy. Nothing is shared until "Create and copy link" (the token never leaves this dialog before that), and
 * closing any other way deletes the upload again.
 */
export default function SharePhotoDialog({ file, onClose }: Props): ReactNode {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { copy } = useCopyFeedback()
  const startedRef = useRef(false)
  const closedRef = useRef(false)
  const [confirmed, setConfirmed] = useState<string | null>(null)
  const [zoomed, setZoomed] = useState(false)

  const refreshList = (): void => void queryClient.invalidateQueries({ queryKey: myPhotoSharesQuery().queryKey })

  const { mutate: startCreate, ...create } = useMutation({
    mutationFn: async (source: File) => createShare(await shrinkImage(source)),
    onSuccess: share => {
      refreshList()
      // Closed while the upload was still running: nothing was confirmed, so take it back.
      if (closedRef.current) void deleteShare(share.id).then(refreshList, () => undefined)
    }
  })
  const share: CreateShareResponse | undefined = create.data
  // Only read for the "limit reached" message, which names the user's own cap (admins have a higher one).
  const mine = useQuery({ ...myPhotoSharesQuery(), enabled: create.isError })

  useEffect(() => {
    if (!file || startedRef.current) return
    startedRef.current = true
    startCreate(file)
  }, [file, startCreate])

  const close = (): void => {
    closedRef.current = true
    if (share && !confirmed) void deleteShare(share.id).then(refreshList, () => undefined)
    onClose()
  }

  const confirm = (): void => {
    if (!share) return
    const link = shareUrl(share.plate, share.token)
    saveShareToken(share.id, share.token, share.expiresAt)
    copy(link)
    setConfirmed(link)
    refreshList()
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // The zoom viewer handles its own Escape.
      if (e.key === 'Escape' && !zoomed) close()
    }
    document.addEventListener('keydown', handleKeyDown)
    return (): void => document.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={close}>
          <div
            role="dialog"
            aria-modal
            aria-labelledby="share-photo-title"
            onClick={e => e.stopPropagation()}
            className="max-h-full w-full max-w-md overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl"
          >
            <h2 id="share-photo-title" className="mb-3 text-lg font-semibold">
              {t('photoShare.title')}
            </h2>

            {!file && <p className="text-sm">{t('photoShare.pickAgain')}</p>}

            {file && create.isPending && (
              <p role="status" className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                <Spinner />
                {t('photoShare.preparing')}
              </p>
            )}

            {create.isError && (
              <div className="space-y-2 text-sm">
                <p className="text-red-600">
                  {t(shareErrorKey(create.error), { max: mine.data?.max ?? SHARE_MAX_ACTIVE })}
                </p>
                {shareErrorKey(create.error) === 'photoShare.error.limit' && <MineLink onClick={close} />}
              </div>
            )}

            {share && (
              <div className="space-y-3 text-sm">
                <button
                  type="button"
                  onClick={() => setZoomed(true)}
                  aria-label={t('photoShare.zoom')}
                  title={t('photoShare.zoom')}
                  className="group relative flex w-full cursor-zoom-in justify-center rounded-lg bg-black/80"
                >
                  <img
                    src={shareImageUrl(share.token)}
                    alt={t('photoShare.previewAlt')}
                    className="max-h-64 max-w-full rounded-lg"
                  />
                  <span
                    aria-hidden
                    className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-base text-white group-hover:bg-black/80"
                  >
                    🔍
                  </span>
                </button>
                {confirmed ? (
                  <>
                    <p className="font-medium" role="status">
                      {t('photoShare.copied')}
                    </p>
                    <MineLink onClick={close} />
                    <input
                      readOnly
                      value={confirmed}
                      onFocus={e => e.currentTarget.select()}
                      aria-label={t('photoShare.linkLabel')}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs"
                    />
                  </>
                ) : (
                  <ul className="list-disc space-y-1 pl-5 text-[var(--color-muted)]">
                    <li className="font-medium text-[var(--color-fg)]">{t('photoShare.checkFaces')}</li>
                    <li>{t('photoShare.publicNote')}</li>
                    <li>{t('photoShare.expiresNote', { days: SHARE_TTL_DAYS })}</li>
                    <li>{t('photoShare.copyNote')}</li>
                  </ul>
                )}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-bg)]"
              >
                {confirmed ? t('photoShare.done') : t('photoShare.cancel')}
              </button>
              {share && !confirmed && (
                <button
                  type="button"
                  onClick={confirm}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  {t('photoShare.confirm')}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
      {zoomed && share && (
        <Suspense fallback={null}>
          <PhotoZoomDialog
            raised
            url={shareImageUrl(share.token)}
            candidates={share.candidates}
            active={null}
            onClose={() => setZoomed(false)}
          />
        </Suspense>
      )}
    </>
  )
}
