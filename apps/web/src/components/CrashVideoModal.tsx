import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { safetyVideoUrl } from '@/lib/api'

type Props = {
  /** The original NHTSA .wmv URL — our own API transcodes and caches it server-side. */
  nhtsaVideoUrl: string
  /** The tested trim's own description, e.g. "2015 Ford Focus 5 HB FWD". */
  description: string
  onClose: () => void
}

/**
 * NHTSA's crash-test clips are .wmv, a codec no modern browser can decode
 * (verified against Chrome directly — canPlayType is empty, playback errors
 * with MEDIA_ERR_SRC_NOT_SUPPORTED). We proxy them through our own
 * /api/safety/video, which transcodes to mp4 once and caches it, so this modal
 * just points a normal <video> tag at our own origin.
 */
export default function CrashVideoModal({ nhtsaVideoUrl, description, onClose }: Props): ReactNode {
  const { t } = useTranslation()
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-2xl rounded-xl bg-[var(--color-surface)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">{t('safety.videoTitle')}</div>
            <div className="truncate text-sm text-[var(--color-muted)]">{description}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('safety.videoClose')}
            className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            ✕
          </button>
        </div>

        {!ready && !failed && <p className="py-8 text-center text-sm text-[var(--color-muted)]">{t('safety.videoLoading')}</p>}

        {failed ? (
          <div className="py-8 text-center text-sm text-[var(--color-muted)]">
            <p className="mb-2">{t('safety.videoError')}</p>
            <a href={nhtsaVideoUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline">
              {t('safety.videoDownloadOriginal')} ↗
            </a>
          </div>
        ) : (
          <video
            src={safetyVideoUrl(nhtsaVideoUrl)}
            controls
            autoPlay
            className={ready ? 'w-full rounded-lg bg-black' : 'hidden'}
            onCanPlay={() => setReady(true)}
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </div>
  )
}
