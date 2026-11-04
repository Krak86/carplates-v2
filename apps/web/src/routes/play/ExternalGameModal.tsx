import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import type { ExternalGame } from '@/routes/play/games'

type Props = {
  game: ExternalGame
  onClose: () => void
}

/**
 * The game's own page in an iframe (nothing is downloaded or re-hosted). Mounted only after the click, so the hub never contacts
 * the site on its own. Portal like `Model3dModal`. Always offers the new-tab link for devices where the game does not fit a window.
 */
export default function ExternalGameModal({ game, onClose }: Props): ReactNode {
  const { t } = useTranslation()
  const title = t(`play.external.${game.id}.title`)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-2 sm:p-4"
      role="dialog"
      aria-modal
    >
      <div className="flex max-h-full w-full max-w-5xl flex-col rounded-xl bg-surface p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="truncate font-semibold">{title}</div>
          <div className="flex shrink-0 items-center gap-3 text-sm">
            <a href={game.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {t('play.external.openTab')}
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('play.external.close')}
              className="cursor-pointer text-muted hover:text-fg"
            >
              ✕
            </button>
          </div>
        </div>

        <iframe
          src={game.url}
          title={title}
          className="aspect-video max-h-[70dvh] min-h-64 w-full rounded-lg bg-black"
          allow="autoplay; fullscreen; gamepad; accelerometer; gyroscope"
          allowFullScreen
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
        />

        <p className="mt-2 text-sm text-muted">{t('play.external.modalNote', { host: new URL(game.url).host })}</p>
      </div>
    </div>,
    document.body
  )
}
