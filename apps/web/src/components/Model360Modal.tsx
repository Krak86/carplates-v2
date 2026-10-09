import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { Model360, Winner360 } from '@carplates/shared'

import ShareButton from '@/components/ShareButton'
import { cn } from '@/lib/cn'
import {
  model360ChipLabel,
  model360ShareTab,
  model360EmbedUrl,
  model360PageUrl,
  winner360ChipLabel,
  winner360ShareTab,
  winner360Url
} from '@/lib/model360'

type View = 'exterior' | 'interior' | 'alt'

type Props = {
  /** Newest generation first. May be empty when only alternative interiors exist. */
  models: Model360[]
  /** Winner Imports interior panoramas (newest model year first); the "Alt. interior" tab appears when non-empty. */
  winner: Winner360[]
  /** "Kia Ceed" — the make/model the list is for (the year is deliberately not part of it). */
  label: string
  /** Gallery to show first (a shared link's id); falls back to the first one if it isn't in the list. */
  initialId?: number | null
  /** Alternative interior to show first (a shared link's photo_recid). */
  initialWinnerId?: number | null
  /** View to open on (a shared link's); defaults to the cabin. */
  initialInterior?: boolean
  onClose: () => void
}

/**
 * carshow360.net's own embed iframe (nothing is re-hosted) for one 360° gallery of this make/model. Every
 * generation/trim gallery is a chip labelled with the text after the model name ("III FL2021 Hatchback"), plus an
 * Exterior / Interior toggle. A third "Alt. interior" tab shows a dealer-stock interior panorama from Winner Imports
 * (stock.winner.ua's own viewer page, also embedded); its chips are the stock model years/trims. Lazy-loaded and only
 * mounted after the viewer clicks the chip, so a result card never contacts either site on its own. Portal for the same
 * reason as Model3dModal (the Card's 3D tilt transform).
 */
export default function Model360Modal({
  models,
  winner,
  label,
  initialId,
  initialWinnerId,
  initialInterior = true,
  onClose
}: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      models.findIndex(m => m.id === initialId)
    )
  )
  const [winnerIndex, setWinnerIndex] = useState(() =>
    Math.max(
      0,
      winner.findIndex(w => w.photoRecid === initialWinnerId)
    )
  )
  const [view, setView] = useState<View>(() => {
    const wantsAlt = winner.length > 0 && (models.length === 0 || (initialWinnerId ?? null) !== null)
    if (wantsAlt) return 'alt'
    return initialInterior ? 'interior' : 'exterior'
  })
  const frameRef = useRef<HTMLIFrameElement>(null)
  const current = models[index]
  const currentWinner = winner[winnerIndex]
  const generation = (n: string): string => t('model360.generation', { n })
  const isAlt = view === 'alt' && !!currentWinner
  const name = isAlt
    ? `${label} ${winner360ChipLabel(currentWinner)}`
    : current
      ? (current.title ?? `${label} ${model360ChipLabel(current, generation)}`)
      : label
  const shareTab = isAlt
    ? winner360ShareTab(currentWinner.photoRecid)
    : model360ShareTab(current?.id ?? 0, view === 'interior')
  const views: { id: View; icon: string; text: string }[] = [
    ...(models.length > 0
      ? [
          { id: 'exterior' as const, icon: '🚗', text: t('model360.exterior') },
          { id: 'interior' as const, icon: '💺', text: t('model360.interior') }
        ]
      : []),
    ...(winner.length > 0 ? [{ id: 'alt' as const, icon: '🛋️', text: t('model360.altInterior') }] : [])
  ]

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
              tab={shareTab}
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
            {views.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-pressed={view === v.id}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3.5 py-1 font-medium transition-colors',
                  view === v.id
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-fg)]'
                )}
              >
                <span aria-hidden>{v.icon}</span>
                {v.text}
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

        {isAlt
          ? winner.length > 1 && (
              <ul className="mb-2 flex flex-wrap gap-1.5">
                {winner.map((w, i) => (
                  <li key={w.photoRecid}>
                    <button
                      type="button"
                      onClick={() => setWinnerIndex(i)}
                      aria-current={i === winnerIndex}
                      className={cn(
                        'rounded-full border px-2.5 py-0.5 text-xs',
                        i === winnerIndex
                          ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                      )}
                    >
                      {winner360ChipLabel(w)}
                    </button>
                  </li>
                ))}
              </ul>
            )
          : models.length > 1 && (
              <ul className="mb-2 flex flex-wrap gap-1.5">
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

        <iframe
          ref={frameRef}
          key={isAlt ? `w-${currentWinner.photoRecid}` : `${current?.id}-${view}`}
          src={
            isAlt
              ? winner360Url(currentWinner)
              : current
                ? model360EmbedUrl(current, i18n.language, view === 'interior')
                : undefined
          }
          title={name}
          className="h-[52dvh] w-full rounded-lg border-0 sm:h-[68dvh]"
          allow="web-share; fullscreen"
          allowFullScreen
        />

        <p className="mt-2 text-sm text-[var(--color-muted)]">
          <a
            href={isAlt ? winner360Url(currentWinner) : current ? model360PageUrl(current, i18n.language) : undefined}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-semibold underline"
          >
            {name}
          </a>{' '}
          {t('model360.on')}{' '}
          <a
            href={isAlt ? 'https://stock.winner.ua' : 'https://carshow360.net'}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-semibold underline"
          >
            {isAlt ? 'Winner Imports' : 'CarShow360'}
          </a>
          . {t(isAlt ? 'model360.noteAlt' : 'model360.note')}
        </p>
      </div>
    </div>,
    document.body
  )
}
