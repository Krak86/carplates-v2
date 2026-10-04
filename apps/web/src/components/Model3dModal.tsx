import { useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { Model3d } from '@carplates/shared'

import ShareButton from '@/components/ShareButton'
import { cn } from '@/lib/cn'

type Props = {
  /** Most-liked first. */
  models: Model3d[]
  /** "Kia Ceed" — the make/model the list is for (the year is deliberately not part of it). */
  label: string
  /** Model to show first (a shared link's uid); falls back to the first one if it isn't in the list. */
  initialUid?: string | null
  onClose: () => void
}

/**
 * Sketchfab's own embed iframe (their Viewer, hosted by them) — nothing is downloaded or re-hosted, and the
 * author/licence credit stays visible as their embed terms ask. The list is every community model of this make/model
 * (any generation, any year), picked from a thumbnail strip or with prev/next. Lazy-loaded and only mounted after the
 * viewer clicks the chip, so a result card never contacts Sketchfab on its own. Portal for the same reason as
 * YouTubeModal: the Card's 3D tilt transform would otherwise become the `position: fixed` containing block.
 */
export default function Model3dModal({ models, label, initialUid, onClose }: Props): ReactNode {
  const { t } = useTranslation()
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      models.findIndex(m => m.uid === initialUid)
    )
  )
  const current = models[index]!

  const handleStep = (delta: number): void => setIndex(i => (i + delta + models.length) % models.length)

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal>
      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-xl bg-[var(--color-surface)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">{t('model3d.title', { label })}</div>
            <div className="truncate text-sm text-[var(--color-muted)]">{current.name}</div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ShareButton
              section="model3d"
              tab={current.uid}
              label={t('share.button', { section: t('model3d.shareName') })}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label={t('model3d.close')}
              className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              ✕
            </button>
          </div>
        </div>

        <iframe
          key={current.uid}
          src={`https://sketchfab.com/models/${current.uid}/embed?autostart=1&ui_infos=0`}
          title={current.name}
          className="aspect-video w-full rounded-lg"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          allowFullScreen
        />

        <p className="mt-2 text-sm text-[var(--color-muted)]">
          <a
            href={`https://sketchfab.com/3d-models/${current.uid}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-semibold underline"
          >
            {current.name}
          </a>{' '}
          {t('model3d.by')}{' '}
          <a
            href={current.authorUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-semibold underline"
          >
            {current.authorName}
          </a>{' '}
          {t('model3d.on')}{' '}
          <a
            href="https://sketchfab.com"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-semibold underline"
          >
            Sketchfab
          </a>
          {current.license ? ` · ${current.license}` : ''}. {t('model3d.note')}
        </p>

        {models.length > 1 && (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => handleStep(-1)}
                aria-label={t('model3d.prev')}
                className="rounded-full border border-[var(--color-border)] px-3 py-0.5 hover:border-[var(--color-primary)]"
              >
                ‹
              </button>
              <span className="text-[var(--color-muted)]">
                {t('model3d.counter', { n: index + 1, total: models.length })}
              </span>
              <button
                type="button"
                onClick={() => handleStep(1)}
                aria-label={t('model3d.next')}
                className="rounded-full border border-[var(--color-border)] px-3 py-0.5 hover:border-[var(--color-primary)]"
              >
                ›
              </button>
            </div>

            <ul className="flex snap-x gap-2 overflow-x-auto pb-2">
              {models.map((m, i) => (
                <li key={m.uid} className="w-28 shrink-0 snap-start">
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-current={i === index}
                    title={m.name}
                    className={cn(
                      'block w-full overflow-hidden rounded-md border text-left',
                      i === index ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]'
                    )}
                  >
                    {m.thumbUrl ? (
                      <img src={m.thumbUrl} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="aspect-video w-full bg-[var(--color-border)]" />
                    )}
                    <div className="truncate px-1 py-0.5 text-xs">
                      {m.year ? `${m.year} · ` : ''}
                      {m.name}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
