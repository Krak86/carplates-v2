import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  youtubeId: string
  description: string
  onClose: () => void
}

/**
 * Euro NCAP's crash-test clips are YouTube embeds, unlike NHTSA's raw .wmv files
 * (see CrashVideoModal) — no transcode/proxy needed, just point an iframe at
 * YouTube's own no-cookie player. The iframe is only created once this modal
 * mounts (i.e. only after the viewer clicks play), so rendering a result card
 * never fires a request to YouTube on its own.
 */
export default function YouTubeModal({ youtubeId, description, onClose }: Props): ReactNode {
  const { t } = useTranslation()

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

        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`}
          title={description}
          className="aspect-video w-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}
