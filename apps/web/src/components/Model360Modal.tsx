import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { Model360 } from '@carplates/shared'

import ShareButton from '@/components/ShareButton'
import { cn } from '@/lib/cn'
import { model360ChipLabel, model360ShareTab,model360EmbedUrl, model360PageUrl } from '@/lib/model360'

type Props = {
  /** Newest generation first. */
  models: Model360[]
  /** "Kia Ceed" — the make/model the list is for (the year is deliberately not part of it). */
  label: string
  /** Gallery to show first (a shared link's id); falls back to the first one if it isn't in the list. */
  initialId?: number | null
  /** View to open on (a shared link's); defaults to the cabin. */
  initialInterior?: boolean
  onClose: () => void
}

/**
 * carshow360.net's own embed iframe (nothing is re-hosted) for one 360° gallery of this make/model. Every
 * generation/trim gallery is a chip labelled with the text after the model name ("III FL2021 Hatchback"), plus an
 * Exterior / Interior toggle. Lazy-loaded and only mounted after the viewer clicks the chip, so a result card never
 * contacts carshow360.net on its own. Portal for the same reason as Model3dModal (the Card's 3D tilt transform).
 */
export default function Model360Modal({ models, label, initialId, initialInterior = true, onClose }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      models.findIndex(m => m.id === initialId)
    )
  )
  const [interior, setInterior] = useState(initialInterior)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const current = models[index]!
  const generation = (n: string): string => t('model360.generation', { n })
  const name = current.title ?? `${label} ${model360ChipLabel(current, generation)}`

  const handleFullscreen = (): void => {
    void frameRef.current?.requestFullscreen?.()
  }

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal>
      <div className="max-h-full w-full max-w-5xl overflow-y-auto rounded-xl bg-[var(--color-surface)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">{t('model360.title', { label })}</div>
            <div className="truncate text-sm text-[var(--color-muted)]">{name}</div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ShareButton
              section="model360"
              tab={model360ShareTab(current.id, interior)}
              label={t('share.button', { section: t('model360.shareName') })}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label={t('model360.close')}
              className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mb-2 flex items-center gap-2 text-sm">
          <div role="group" className="inline-flex rounded-full border border-[var(--color-border)] p-0.5">
            {[false, true].map(isInterior => (
              <button
                key={String(isInterior)}
                type="button"
                onClick={() => setInterior(isInterior)}
                aria-pressed={interior === isInterior}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3.5 py-1 font-medium transition-colors',
                  interior === isInterior
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
                )}
              >
                <span aria-hidden>{isInterior ? '💺' : '🚗'}</span>
                {t(isInterior ? 'model360.interior' : 'model360.exterior')}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleFullscreen}
            title={t('model360.fullscreen')}
            aria-label={t('model360.fullscreen')}
            className="ml-auto rounded-full border border-[var(--color-border)] px-3 py-0.5 hover:border-[var(--color-primary)]"
          >
            <span aria-hidden>⛶</span>
          </button>
        </div>

        <iframe
          ref={frameRef}
          key={`${current.id}-${interior}`}
          src={model360EmbedUrl(current, i18n.language, interior)}
          title={name}
          className="h-[52dvh] w-full rounded-lg border-0 sm:h-[68dvh]"
          allow="web-share; fullscreen"
          allowFullScreen
        />

        <p className="mt-2 text-sm text-[var(--color-muted)]">
          <a
            href={model360PageUrl(current, i18n.language)}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-semibold underline"
          >
            {name}
          </a>{' '}
          {t('model360.on')}{' '}
          <a
            href="https://carshow360.net"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-semibold underline"
          >
            CarShow360
          </a>
          . {t('model360.note')}
        </p>

        {models.length > 1 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {models.map((m, i) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={i === index}
                  title={m.title ?? model360ChipLabel(m, generation)}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs',
                    i === index
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                  )}
                >
                  {model360ChipLabel(m, generation)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body
  )
}
