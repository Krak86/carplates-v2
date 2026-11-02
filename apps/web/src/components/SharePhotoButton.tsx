import { Suspense, lazy, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useSession } from '@/components/auth/use-session'
import ShareIcon from '@/components/ShareIcon'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { shrinkImage } from '@/lib/image'
import { clearPendingShare, savePendingShare } from '@/lib/pending-share'

// Loaded on the first click: online-only, and Google's script only starts once the sign-in panel is shown.
const SharePhotoDialog = lazy(() => import('@/components/SharePhotoDialog'))
const GoogleSignInButton = lazy(() => import('@/components/auth/GoogleSignInButton'))
const TelegramSignInButton = lazy(() => import('@/components/auth/TelegramSignInButton'))
const EmailSignInForm = lazy(() => import('@/components/auth/EmailSignInForm'))

type Props = {
  /** The photo the user picked (the dialog shrinks it; the original and its metadata are never uploaded). */
  file: File
}

/** "Share" on the photo card. Anonymous: a sign-in panel, with the photo parked in IndexedDB for the redirect case. */
export default function SharePhotoButton({ file }: Props): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const { user } = useSession()
  const [wantsShare, setWantsShare] = useState(false)

  if (!online) return null

  const stop = (): void => {
    setWantsShare(false)
    void clearPendingShare()
  }

  const handleClick = (): void => {
    setWantsShare(true)
    if (!user) void shrinkImage(file).then(savePendingShare, () => undefined)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white hover:bg-black/90"
      >
        <ShareIcon />
        {t('photoShare.button')}
      </button>

      {wantsShare && !user && (
        <div className="absolute bottom-10 left-2 z-10 max-w-[calc(100%-1rem)] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-left text-sm shadow-lg">
          <p className="mb-2 font-medium">{t('photoShare.signInPrompt')}</p>
          <Suspense fallback={null}>
            <GoogleSignInButton />
            <TelegramSignInButton />
            <EmailSignInForm />
          </Suspense>
          <button type="button" onClick={stop} className="mt-2 text-xs text-[var(--color-muted)] underline">
            {t('photoShare.cancel')}
          </button>
        </div>
      )}

      {/* Signed in (also right after the sign-in above): the dialog opens with the same photo, no record needed. */}
      {wantsShare && user && (
        <Suspense fallback={null}>
          <SharePhotoDialog file={file} onClose={stop} />
        </Suspense>
      )}
    </>
  )
}
